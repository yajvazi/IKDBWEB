import "server-only";

import type Stripe from "stripe";
import { getDb } from "@/server/db/client";
import { modifyResellerBalanceCommand } from "@/server/ocs/commands";
import { getOcsClient } from "@/server/ocs/client";
import { redactOcsPayload } from "@/server/ocs/redaction";
import { getStripeClient, type StripeRuntimeMode } from "@/server/stripe/client";

export type SubresellerTopupSettings = {
  minimumAmountMinor: number;
  currency: "EUR";
  stripeMode: StripeRuntimeMode;
};

export type SubresellerTopup = {
  id: string;
  resellerId: string;
  resellerName: string;
  ocsResellerId: number;
  amountMinor: number;
  stripeFeeMinor: number;
  netAmountMinor: number;
  currency: string;
  stripeMode: StripeRuntimeMode;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripeBalanceTransactionId: string | null;
  paymentStatus: string;
  ocsStatus: string;
  lastError: string | null;
  createdByAdminEmail: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  appliedAt: string | null;
};

const defaultSettings: SubresellerTopupSettings = {
  minimumAmountMinor: 50_000,
  currency: "EUR",
  stripeMode: "test",
};

export async function getSubresellerTopupSettings(): Promise<SubresellerTopupSettings> {
  const db = getDb();
  if (!db) return defaultSettings;

  const rows = await db`
    select value
    from system_settings
    where key = 'subreseller_topup.settings'
    limit 1
  `;

  return normalizeSettings(rows[0]?.value);
}

export async function updateSubresellerTopupSettings(input: SubresellerTopupSettings) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const settings = normalizeSettings(input);
  await db`
    insert into system_settings (key, value, updated_at)
    values ('subreseller_topup.settings', ${JSON.stringify(settings)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;

  return settings;
}

export async function listSubresellerTopups(limit = 30): Promise<SubresellerTopup[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db`
    select
      t.*,
      r.name as reseller_name
    from subreseller_topups t
    join resellers r on r.id = t.reseller_id
    order by t.created_at desc
    limit ${limit}
  `;

  return rows.map(topupFromRow);
}

export async function getSubresellerTopupForReseller(input: {
  topupId: string;
  resellerId: string;
}): Promise<SubresellerTopup | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db`
    select
      t.*,
      r.name as reseller_name
    from subreseller_topups t
    join resellers r on r.id = t.reseller_id
    where t.id = ${input.topupId}
      and t.reseller_id = ${input.resellerId}
    limit 1
  `;

  return rows[0] ? topupFromRow(rows[0]) : null;
}

export async function createSubresellerTopupPaymentIntent(input: {
  resellerId: string;
  amountMinor: number;
  adminEmail: string;
}) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const settings = await getSubresellerTopupSettings();
  if (input.amountMinor < settings.minimumAmountMinor) {
    throw new Error(`Minimum subreseller top-up is ${formatMinor(settings.minimumAmountMinor, settings.currency)}.`);
  }

  const [profile] = await db`
    select id::text, name, ocs_reseller_id, active
    from resellers
    where id = ${input.resellerId}
    limit 1
  `;

  if (!profile || !profile.active) throw new Error("Active subreseller profile not found.");

  const [created] = await db`
    insert into subreseller_topups (
      reseller_id,
      ocs_reseller_id,
      amount_minor,
      net_amount_minor,
      currency,
      stripe_mode,
      payment_status,
      ocs_status,
      created_by_admin_email,
      metadata
    )
    values (
      ${input.resellerId},
      ${Number(profile.ocs_reseller_id)},
      ${input.amountMinor},
      ${input.amountMinor},
      ${settings.currency},
      ${settings.stripeMode},
      'requires_payment',
      'not_started',
      ${input.adminEmail},
      ${JSON.stringify({ resellerName: profile.name })}::jsonb
    )
    returning *
  `;

  try {
    const stripe = getStripeClient(settings.stripeMode);
    const intent = await stripe.paymentIntents.create(
      {
        amount: input.amountMinor,
        currency: settings.currency.toLowerCase(),
        payment_method_types: ["card"],
        description: `InternetKudo subreseller balance top-up for ${profile.name}`,
        metadata: {
          internetkudoPurpose: "subreseller_balance_topup",
          subresellerTopupId: String(created.id),
          resellerId: input.resellerId,
          ocsResellerId: String(profile.ocs_reseller_id),
          stripeMode: settings.stripeMode,
        },
      },
      { idempotencyKey: `internetkudo-subreseller-topup-${created.id}` },
    );

    const [updated] = await db`
      update subreseller_topups
      set stripe_payment_intent_id = ${intent.id},
          payment_status = ${paymentStatusForIntent(intent.status)},
          updated_at = now()
      where id = ${created.id}
      returning *
    `;

    return {
      topup: topupFromRow({ ...updated, reseller_name: profile.name }),
      clientSecret: intent.client_secret,
      publishableKeyMode: settings.stripeMode,
    };
  } catch (error) {
    await db`
      update subreseller_topups
      set payment_status = 'failed',
          last_error = ${error instanceof Error ? error.message : "Stripe PaymentIntent creation failed."},
          updated_at = now()
      where id = ${created.id}
    `;
    throw error;
  }
}

export async function handleSubresellerTopupPaymentSucceeded(paymentIntent: Stripe.PaymentIntent, requestId: string) {
  if (paymentIntent.metadata?.internetkudoPurpose !== "subreseller_balance_topup") {
    return { handled: false };
  }

  const topupId = paymentIntent.metadata.subresellerTopupId;
  if (!topupId) return { handled: true, applied: false, error: "PaymentIntent is missing subresellerTopupId metadata." };

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  await db`
    update subreseller_topups
    set payment_status = 'succeeded',
        paid_at = coalesce(paid_at, now()),
        updated_at = now()
    where id = ${topupId}
      and stripe_payment_intent_id = ${paymentIntent.id}
  `;

  const result = await applyPaidSubresellerTopup(topupId, {
    source: "stripe_webhook",
    requestId,
    stripePaymentIntentId: paymentIntent.id,
  });

  return { handled: true, ...result };
}

export async function applyPaidSubresellerTopup(topupId: string, input: {
  source: "stripe_webhook" | "admin";
  requestId: string;
  stripePaymentIntentId?: string;
}) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const [topup] = await db`
    select
      t.*,
      r.name as reseller_name
    from subreseller_topups t
    join resellers r on r.id = t.reseller_id
    where t.id = ${topupId}
    limit 1
  `;

  if (!topup) throw new Error("Subreseller top-up not found.");
  if (topup.ocs_status === "applied") return { applied: true, topup: topupFromRow(topup) };
  if (topup.payment_status !== "succeeded") throw new Error("Top-up payment is not succeeded yet.");
  if (topup.ocs_status === "applying") throw new Error("Top-up is already being applied to OCS.");

  await db`
    update subreseller_topups
    set ocs_status = 'applying',
        last_error = null,
        updated_at = now()
    where id = ${topupId}
  `;

  try {
    const stripeMode: StripeRuntimeMode = topup.stripe_mode === "test" ? "test" : "live";
    const settlement = await resolveStripeSettlement({
      paymentIntentId: String(topup.stripe_payment_intent_id ?? input.stripePaymentIntentId ?? ""),
      mode: stripeMode,
      fallbackGrossMinor: Number(topup.amount_minor),
    });
    if (settlement.netAmountMinor <= 0) {
      throw new Error("Stripe fee is greater than or equal to the paid amount; no positive OCS credit can be applied.");
    }

    await db`
      update subreseller_topups
      set stripe_fee_minor = ${settlement.stripeFeeMinor},
          net_amount_minor = ${settlement.netAmountMinor},
          stripe_charge_id = ${settlement.stripeChargeId},
          stripe_balance_transaction_id = ${settlement.stripeBalanceTransactionId},
          metadata = coalesce(metadata, '{}'::jsonb) || ${JSON.stringify({
            grossAmountMinor: settlement.grossAmountMinor,
            stripeFeeMinor: settlement.stripeFeeMinor,
            netAmountMinor: settlement.netAmountMinor,
            stripeMode,
            creditsLiveOcsBalance: true,
          })}::jsonb,
          updated_at = now()
      where id = ${topupId}
    `;

    const amount = Number((settlement.netAmountMinor / 100).toFixed(2));
    const modeLabel = stripeMode === "test" ? "Stripe TEST demo top-up" : "Stripe top-up";
    const response = await getOcsClient().executeCommand(modifyResellerBalanceCommand({
      resellerId: Number(topup.ocs_reseller_id),
      type: "Stripe",
      amount,
      setBalance: false,
      description: `InternetKudo ${modeLabel} ${topup.stripe_payment_intent_id ?? input.stripePaymentIntentId ?? topupId}; gross ${formatMinor(settlement.grossAmountMinor, String(topup.currency))}; Stripe fee ${formatMinor(settlement.stripeFeeMinor, String(topup.currency))}; net ${formatMinor(settlement.netAmountMinor, String(topup.currency))}`,
    }));

    await db.begin(async (tx) => {
      await tx`
        insert into reseller_balance_transactions (
          reseller_id,
          amount,
          currency,
          direction,
          source,
          external_id,
          raw_payload
        )
        values (
          ${topup.reseller_id},
          ${amount},
          ${topup.currency},
          'credit',
          'stripe_topup',
          ${topup.stripe_payment_intent_id ?? input.stripePaymentIntentId ?? topupId},
          ${JSON.stringify(redactOcsPayload({ response, requestId: input.requestId, source: input.source, settlement }))}::jsonb
        )
      `;

      await tx`
        update subreseller_topups
        set ocs_status = 'applied',
            ocs_response = ${JSON.stringify(redactOcsPayload(response))}::jsonb,
            applied_at = coalesce(applied_at, now()),
            updated_at = now()
        where id = ${topupId}
      `;
    });

    const [updated] = await db`
      select
        t.*,
        r.name as reseller_name
      from subreseller_topups t
      join resellers r on r.id = t.reseller_id
      where t.id = ${topupId}
      limit 1
    `;

    return { applied: true, topup: topupFromRow(updated) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCS balance update failed.";
    await db`
      update subreseller_topups
      set ocs_status = 'failed',
          last_error = ${message},
          updated_at = now()
      where id = ${topupId}
    `;

    return { applied: false, error: message };
  }
}

function normalizeSettings(value: unknown): SubresellerTopupSettings {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const minimumAmountMinor = Number(record.minimumAmountMinor ?? defaultSettings.minimumAmountMinor);
  const stripeMode = record.stripeMode === "live" ? "live" : defaultSettings.stripeMode;

  return {
    minimumAmountMinor: Number.isFinite(minimumAmountMinor) && minimumAmountMinor > 0 ? Math.round(minimumAmountMinor) : defaultSettings.minimumAmountMinor,
    currency: "EUR",
    stripeMode,
  };
}

function topupFromRow(row: Record<string, unknown>): SubresellerTopup {
  return {
    id: String(row.id),
    resellerId: String(row.reseller_id),
    resellerName: String(row.reseller_name ?? "Subreseller"),
    ocsResellerId: Number(row.ocs_reseller_id),
    amountMinor: Number(row.amount_minor),
    stripeFeeMinor: Number(row.stripe_fee_minor ?? 0),
    netAmountMinor: Number(row.net_amount_minor ?? row.amount_minor ?? 0),
    currency: String(row.currency ?? "EUR"),
    stripeMode: row.stripe_mode === "test" ? "test" : "live",
    stripePaymentIntentId: nullableString(row.stripe_payment_intent_id),
    stripeChargeId: nullableString(row.stripe_charge_id),
    stripeBalanceTransactionId: nullableString(row.stripe_balance_transaction_id),
    paymentStatus: String(row.payment_status),
    ocsStatus: String(row.ocs_status),
    lastError: nullableString(row.last_error),
    createdByAdminEmail: nullableString(row.created_by_admin_email),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : null,
    appliedAt: row.applied_at ? new Date(String(row.applied_at)).toISOString() : null,
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

function paymentStatusForIntent(status: Stripe.PaymentIntent.Status) {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "canceled";
  if (status === "processing") return "processing";
  return "requires_payment";
}

async function resolveStripeSettlement(input: {
  paymentIntentId: string;
  mode: StripeRuntimeMode;
  fallbackGrossMinor: number;
}) {
  if (!input.paymentIntentId) throw new Error("Stripe PaymentIntent ID is missing for this top-up.");

  const stripe = getStripeClient(input.mode);
  const paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId, {
    expand: ["latest_charge.balance_transaction"],
  });
  const charge = await resolveLatestCharge(stripe, paymentIntent);
  const balanceTransaction = await resolveBalanceTransaction(stripe, charge);
  const stripeFeeMinor = Number(balanceTransaction.fee);
  const grossAmountMinor = Number(paymentIntent.amount_received || charge.amount_captured || input.fallbackGrossMinor);

  if (!Number.isFinite(stripeFeeMinor)) throw new Error("Stripe fee is not available yet for this payment.");
  if (!Number.isFinite(grossAmountMinor) || grossAmountMinor <= 0) throw new Error("Stripe gross amount is not available for this payment.");

  return {
    grossAmountMinor,
    stripeFeeMinor,
    netAmountMinor: Math.max(grossAmountMinor - stripeFeeMinor, 0),
    stripeChargeId: charge.id,
    stripeBalanceTransactionId: balanceTransaction.id,
  };
}

async function resolveLatestCharge(stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
  const latestCharge = paymentIntent.latest_charge;
  if (!latestCharge) throw new Error("Stripe charge is not available yet for this top-up.");
  if (typeof latestCharge === "string") {
    return stripe.charges.retrieve(latestCharge, { expand: ["balance_transaction"] });
  }
  return latestCharge;
}

async function resolveBalanceTransaction(stripe: Stripe, charge: Stripe.Charge) {
  const balanceTransaction = charge.balance_transaction;
  if (!balanceTransaction) throw new Error("Stripe balance transaction is not available yet for this charge.");
  if (typeof balanceTransaction === "string") {
    return stripe.balanceTransactions.retrieve(balanceTransaction);
  }
  return balanceTransaction;
}
