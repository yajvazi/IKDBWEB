import "server-only";

import type Stripe from "stripe";
import { getDb } from "@/server/db/client";
import { getStripeClient } from "@/server/stripe/client";

const stripePageLimit = 100;
const syncOverlapSeconds = 5 * 60;
const resourceThrottleMs = 5_000;

const recentSync = new Map<string, number>();

type SyncResource = "payment_intents" | "charges" | "customers" | "balance";

export type StripeCacheStatus = {
  paymentIntents: number;
  charges: number;
  customers: number;
  balanceSnapshots: number;
  lastSyncedAt: string | null;
};

export type StripeBalanceSummary = {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
  capturedAt: string | null;
};

export async function syncStripeCache(resources: SyncResource[] = ["payment_intents", "charges", "customers", "balance"]) {
  const db = getDb();
  if (!db) return;

  let stripe: Stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    console.warn("Stripe cache sync skipped; rendering cached data.", {
      message: error instanceof Error ? error.message : "Unable to initialize Stripe client.",
    });
    return;
  }

  const results = await Promise.allSettled(resources.map((resource) => syncResource(resource, stripe)));
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.warn("Stripe cache sync completed with partial failures; rendering cached data.", {
      failedResources: failures.length,
    });
  }
}

export async function getCachedPaymentIntents(options: { sync?: boolean } = {}) {
  if (options.sync !== false) await syncStripeCache(["payment_intents", "charges", "balance"]);
  const db = getDb();
  if (!db) return [] as Stripe.PaymentIntent[];

  const rows = await db`
    select id, amount, amount_received, currency, status, customer_id, receipt_email,
      description, latest_charge_id, metadata, raw, livemode, created
    from stripe_payment_intents_cache
    order by created desc, id desc
  `;

  return rows.map(paymentIntentFromCacheRow);
}

export async function getCachedCharges(options: { sync?: boolean } = {}) {
  if (options.sync !== false) await syncStripeCache(["charges"]);
  const db = getDb();
  if (!db) return [] as Stripe.Charge[];

  const rows = await db`
    select id, amount, amount_refunded, currency, status, paid, refunded,
      payment_intent_id, customer_id, balance_transaction_id, payment_method_type,
      raw, livemode, created
    from stripe_charges_cache
    order by created desc, id desc
  `;

  return rows.map(chargeFromCacheRow);
}

export async function getCachedCustomers(options: { sync?: boolean } = {}) {
  if (options.sync !== false) await syncStripeCache(["customers"]);
  const db = getDb();
  if (!db) return [] as Stripe.Customer[];

  const rows = await db`
    select id, email, name, phone, delinquent, metadata, raw, livemode, created
    from stripe_customers_cache
    order by created desc, id desc
  `;

  return rows.map(customerFromCacheRow);
}

export async function getStripeCacheStatus(): Promise<StripeCacheStatus> {
  const db = getDb();
  if (!db) return { paymentIntents: 0, charges: 0, customers: 0, balanceSnapshots: 0, lastSyncedAt: null };

  const [counts, state] = await Promise.all([
    db`
      select
        (select count(*)::int from stripe_payment_intents_cache) as payment_intents,
        (select count(*)::int from stripe_charges_cache) as charges,
        (select count(*)::int from stripe_customers_cache) as customers,
        (select count(*)::int from stripe_balance_snapshots) as balance_snapshots
    `,
    db`
      select max(last_synced_at) as last_synced_at
      from stripe_sync_state
    `,
  ]);

  const row = counts[0] ?? {};
  return {
    paymentIntents: Number(row.payment_intents ?? 0),
    charges: Number(row.charges ?? 0),
    customers: Number(row.customers ?? 0),
    balanceSnapshots: Number(row.balance_snapshots ?? 0),
    lastSyncedAt: state[0]?.last_synced_at ? new Date(String(state[0].last_synced_at)).toISOString() : null,
  };
}

export async function getLatestStripeBalanceSummary(): Promise<StripeBalanceSummary | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db`
    select available, pending, captured_at
    from stripe_balance_snapshots
    order by captured_at desc
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    available: balanceAmounts(row.available),
    pending: balanceAmounts(row.pending),
    capturedAt: row.captured_at ? new Date(String(row.captured_at)).toISOString() : null,
  };
}

async function syncResource(resource: SyncResource, stripe: Stripe) {
  const now = Date.now();
  if ((recentSync.get(resource) ?? 0) + resourceThrottleMs > now) return;
  recentSync.set(resource, now);

  try {
    if (resource === "payment_intents") await syncPaymentIntents(stripe);
    if (resource === "charges") await syncCharges(stripe);
    if (resource === "customers") await syncCustomers(stripe);
    if (resource === "balance") await syncBalance(stripe);
  } catch (error) {
    await recordSyncError(resource, error);
    throw error;
  }
}

async function syncPaymentIntents(stripe: Stripe) {
  const state = await getSyncState("payment_intents");
  const created = state?.last_created ? { gt: Math.max(Number(state.last_created) - syncOverlapSeconds, 0) } : undefined;
  const items = await collectStripeHistory(stripe.paymentIntents.list({
    limit: stripePageLimit,
    created,
    expand: ["data.customer", "data.latest_charge"],
  }));
  await upsertPaymentIntents(items);
  await recordSyncSuccess("payment_intents", items);
}

async function syncCharges(stripe: Stripe) {
  const state = await getSyncState("charges");
  const created = state?.last_created ? { gt: Math.max(Number(state.last_created) - syncOverlapSeconds, 0) } : undefined;
  const items = await collectStripeHistory(stripe.charges.list({ limit: stripePageLimit, created }));
  await upsertCharges(items);
  await recordSyncSuccess("charges", items);
}

async function syncCustomers(stripe: Stripe) {
  const state = await getSyncState("customers");
  const created = state?.last_created ? { gt: Math.max(Number(state.last_created) - syncOverlapSeconds, 0) } : undefined;
  const items = await collectStripeHistory(stripe.customers.list({ limit: stripePageLimit, created }));
  await upsertCustomers(items);
  await recordSyncSuccess("customers", items);
}

async function syncBalance(stripe: Stripe) {
  const db = getDb();
  if (!db) return;

  const balance = await stripe.balance.retrieve();
  await db`
    insert into stripe_balance_snapshots (livemode, available, pending, instant_available, raw)
    values (
      ${Boolean(balance.livemode)},
      ${JSON.stringify(balance.available ?? [])}::jsonb,
      ${JSON.stringify(balance.pending ?? [])}::jsonb,
      ${JSON.stringify(balance.instant_available ?? null)}::jsonb,
      ${JSON.stringify(balance)}::jsonb
    )
  `;
  await recordSyncSuccess("balance", []);
}

async function upsertPaymentIntents(items: Stripe.PaymentIntent[]) {
  const db = getDb();
  if (!db || items.length === 0) return;

  await db.begin((tx) => items.map((item) => {
    const latestCharge = typeof item.latest_charge === "object" && item.latest_charge ? item.latest_charge : null;
    const customerId = typeof item.customer === "string" ? item.customer : item.customer?.id ?? null;
    return tx`
      insert into stripe_payment_intents_cache (
        id,
        amount,
        amount_received,
        currency,
        status,
        customer_id,
        receipt_email,
        description,
        latest_charge_id,
        metadata,
        raw,
        livemode,
        created,
        created_at,
        updated_at
      )
      values (
        ${item.id},
        ${item.amount ?? 0},
        ${item.amount_received ?? 0},
        ${item.currency ?? "eur"},
        ${item.status},
        ${customerId},
        ${item.receipt_email ?? null},
        ${item.description ?? null},
        ${latestCharge?.id ?? (typeof item.latest_charge === "string" ? item.latest_charge : null)},
        ${JSON.stringify(item.metadata ?? {})}::jsonb,
        ${JSON.stringify(item)}::jsonb,
        ${Boolean(item.livemode)},
        ${item.created},
        ${new Date(item.created * 1000).toISOString()},
        now()
      )
      on conflict (id) do update set
        amount = excluded.amount,
        amount_received = excluded.amount_received,
        currency = excluded.currency,
        status = excluded.status,
        customer_id = excluded.customer_id,
        receipt_email = excluded.receipt_email,
        description = excluded.description,
        latest_charge_id = excluded.latest_charge_id,
        metadata = excluded.metadata,
        raw = excluded.raw,
        livemode = excluded.livemode,
        created = excluded.created,
        created_at = excluded.created_at,
        updated_at = now()
    `;
  }));
}

async function upsertCharges(items: Stripe.Charge[]) {
  const db = getDb();
  if (!db || items.length === 0) return;

  await db.begin((tx) => items.map((item) => {
    const paymentIntentId = typeof item.payment_intent === "string" ? item.payment_intent : item.payment_intent?.id ?? null;
    const customerId = typeof item.customer === "string" ? item.customer : item.customer?.id ?? null;
    const balanceTransactionId = typeof item.balance_transaction === "string" ? item.balance_transaction : item.balance_transaction?.id ?? null;
    return tx`
      insert into stripe_charges_cache (
        id,
        amount,
        amount_refunded,
        currency,
        status,
        paid,
        refunded,
        payment_intent_id,
        customer_id,
        balance_transaction_id,
        payment_method_type,
        raw,
        livemode,
        created,
        created_at,
        updated_at
      )
      values (
        ${item.id},
        ${item.amount ?? 0},
        ${item.amount_refunded ?? 0},
        ${item.currency ?? "eur"},
        ${item.status ?? null},
        ${Boolean(item.paid)},
        ${Boolean(item.refunded)},
        ${paymentIntentId},
        ${customerId},
        ${balanceTransactionId},
        ${item.payment_method_details?.type ?? null},
        ${JSON.stringify(item)}::jsonb,
        ${Boolean(item.livemode)},
        ${item.created},
        ${new Date(item.created * 1000).toISOString()},
        now()
      )
      on conflict (id) do update set
        amount = excluded.amount,
        amount_refunded = excluded.amount_refunded,
        currency = excluded.currency,
        status = excluded.status,
        paid = excluded.paid,
        refunded = excluded.refunded,
        payment_intent_id = excluded.payment_intent_id,
        customer_id = excluded.customer_id,
        balance_transaction_id = excluded.balance_transaction_id,
        payment_method_type = excluded.payment_method_type,
        raw = excluded.raw,
        livemode = excluded.livemode,
        created = excluded.created,
        created_at = excluded.created_at,
        updated_at = now()
    `;
  }));
}

async function upsertCustomers(items: Stripe.Customer[]) {
  const db = getDb();
  if (!db || items.length === 0) return;

  await db.begin((tx) => items.map((item) => tx`
    insert into stripe_customers_cache (
      id,
      email,
      name,
      phone,
      delinquent,
      metadata,
      raw,
      livemode,
      created,
      created_at,
      updated_at
    )
    values (
      ${item.id},
      ${item.email ?? null},
      ${item.name ?? null},
      ${item.phone ?? null},
      ${Boolean(item.delinquent)},
      ${JSON.stringify(item.metadata ?? {})}::jsonb,
      ${JSON.stringify(item)}::jsonb,
      ${Boolean(item.livemode)},
      ${item.created},
      ${new Date(item.created * 1000).toISOString()},
      now()
    )
    on conflict (id) do update set
      email = excluded.email,
      name = excluded.name,
      phone = excluded.phone,
      delinquent = excluded.delinquent,
      metadata = excluded.metadata,
      raw = excluded.raw,
      livemode = excluded.livemode,
      created = excluded.created,
      created_at = excluded.created_at,
      updated_at = now()
  `));
}

async function getSyncState(resource: SyncResource) {
  const db = getDb();
  if (!db) return null;
  const rows = await db`
    select resource, last_created, last_id, last_synced_at
    from stripe_sync_state
    where resource = ${resource}
    limit 1
  `;
  return rows[0] as { resource: string; last_created: number | null; last_id: string | null; last_synced_at: Date | null } | undefined;
}

async function recordSyncSuccess(resource: SyncResource, items: Array<{ id: string; created?: number }>) {
  const db = getDb();
  if (!db) return;

  const latest = items.reduce<{ id: string | null; created: number | null }>((current, item) => {
    if (!item.created) return current;
    if (current.created === null || item.created > current.created) return { id: item.id, created: item.created };
    return current;
  }, { id: null, created: null });

  await db`
    insert into stripe_sync_state (resource, last_created, last_id, last_synced_at, sync_count, last_error, updated_at)
    values (${resource}, ${latest.created}, ${latest.id}, now(), ${items.length}, null, now())
    on conflict (resource) do update set
      last_created = greatest(coalesce(stripe_sync_state.last_created, 0), coalesce(excluded.last_created, stripe_sync_state.last_created, 0)),
      last_id = coalesce(excluded.last_id, stripe_sync_state.last_id),
      last_synced_at = now(),
      sync_count = stripe_sync_state.sync_count + excluded.sync_count,
      last_error = null,
      updated_at = now()
  `;
}

async function recordSyncError(resource: SyncResource, error: unknown) {
  const db = getDb();
  if (!db) return;
  const message = error instanceof Error ? error.message : "Unknown Stripe sync error";
  await db`
    insert into stripe_sync_state (resource, last_error, updated_at)
    values (${resource}, ${message}, now())
    on conflict (resource) do update set
      last_error = excluded.last_error,
      updated_at = now()
  `;
}

async function collectStripeHistory<T>(list: AsyncIterable<T>) {
  const items: T[] = [];
  for await (const item of list) {
    items.push(item);
  }
  return items;
}

function balanceAmounts(value: unknown): Array<{ amount: number; currency: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as { amount?: unknown; currency?: unknown };
      const amount = Number(record.amount ?? 0);
      const currency = typeof record.currency === "string" ? record.currency : "eur";
      return Number.isFinite(amount) ? { amount, currency } : null;
    })
    .filter((item): item is { amount: number; currency: string } => Boolean(item));
}

function paymentIntentFromCacheRow(row: Record<string, unknown>): Stripe.PaymentIntent {
  const raw = parsedStripeRaw<Partial<Stripe.PaymentIntent>>(row.raw);
  return {
    ...raw,
    id: stringValue(row.id, raw.id),
    object: "payment_intent",
    amount: numberValue(row.amount, raw.amount),
    amount_received: numberValue(row.amount_received, raw.amount_received),
    currency: stringValue(row.currency, raw.currency, "eur"),
    status: stringValue(row.status, raw.status, "requires_payment_method") as Stripe.PaymentIntent.Status,
    customer: stringValue(row.customer_id) || raw.customer || null,
    receipt_email: stringValue(row.receipt_email) || raw.receipt_email || null,
    description: stringValue(row.description) || raw.description || null,
    latest_charge: stringValue(row.latest_charge_id) || raw.latest_charge || null,
    metadata: objectValue(row.metadata, raw.metadata),
    livemode: booleanValue(row.livemode, raw.livemode),
    created: numberValue(row.created, raw.created),
  } as Stripe.PaymentIntent;
}

function chargeFromCacheRow(row: Record<string, unknown>): Stripe.Charge {
  const raw = parsedStripeRaw<Partial<Stripe.Charge>>(row.raw);
  return {
    ...raw,
    id: stringValue(row.id, raw.id),
    object: "charge",
    amount: numberValue(row.amount, raw.amount),
    amount_refunded: numberValue(row.amount_refunded, raw.amount_refunded),
    currency: stringValue(row.currency, raw.currency, "eur"),
    status: stringValue(row.status, raw.status, "succeeded") as Stripe.Charge.Status,
    paid: booleanValue(row.paid, raw.paid),
    refunded: booleanValue(row.refunded, raw.refunded),
    payment_intent: stringValue(row.payment_intent_id) || raw.payment_intent || null,
    customer: stringValue(row.customer_id) || raw.customer || null,
    balance_transaction: stringValue(row.balance_transaction_id) || raw.balance_transaction || null,
    payment_method_details: {
      ...raw.payment_method_details,
      type: stringValue(row.payment_method_type, raw.payment_method_details?.type, "card"),
    },
    livemode: booleanValue(row.livemode, raw.livemode),
    created: numberValue(row.created, raw.created),
  } as Stripe.Charge;
}

function customerFromCacheRow(row: Record<string, unknown>): Stripe.Customer {
  const raw = parsedStripeRaw<Partial<Stripe.Customer>>(row.raw);
  return {
    ...raw,
    id: stringValue(row.id, raw.id),
    object: "customer",
    email: stringValue(row.email) || raw.email || null,
    name: stringValue(row.name) || raw.name || null,
    phone: stringValue(row.phone) || raw.phone || null,
    delinquent: booleanValue(row.delinquent, raw.delinquent),
    metadata: objectValue(row.metadata, raw.metadata),
    livemode: booleanValue(row.livemode, raw.livemode),
    created: numberValue(row.created, raw.created),
  } as Stripe.Customer;
}

function parsedStripeRaw<T extends Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  if (typeof value !== "string") return {} as T;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as T;
    if (typeof parsed === "string") return parsedStripeRaw<T>(parsed);
  } catch {
    return {} as T;
  }

  return {} as T;
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function booleanValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return false;
}

function objectValue(...values: unknown[]) {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Stripe.Metadata;
  }
  return {};
}
