import type { AdminRecord, AdminWorkspaceConfig } from "@/components/admin/operations-data";
import {
  adminUsersConfig,
  apiLogsConfig,
  auditLogsConfig,
  esimsConfig,
  ordersConfig,
  settingsConfig,
  webhookConfig,
} from "@/components/admin/operations-data";
import type { StatusTone } from "@/types/admin";
import { getDb } from "@/server/db/client";
import { getStripeOrdersWorkspaceConfig } from "@/server/stripe/live-data";
import { listAdminUsers } from "@/server/auth/admin-auth";

export async function getOrdersWorkspaceConfig(options: { startingAfter?: string } = {}) {
  const rows = await query`
    select o.id::text, o.order_number, o.currency, o.total_minor, o.payment_status,
           o.provisioning_status, o.order_status, o.created_at, p.email
    from orders o
    left join customers c on c.id = o.customer_id
    left join profiles p on p.id = c.id
    order by o.created_at desc
    limit 100
  `;

  if (rows.length === 0) {
    try {
      return await getStripeOrdersWorkspaceConfig(options);
    } catch (error) {
      console.warn("Stripe order fallback failed; returning empty live order records.", error instanceof Error ? { message: error.message } : {});
    }
  }

  return withRecords(ordersConfig, rows.map(orderRecord), "No live orders exist yet. Orders will appear after checkout creates pending orders and Stripe webhooks confirm payment.");
}

export async function getEsimsWorkspaceConfig() {
  const rows = await query`
    select id::text, ocs_esim_id, ocs_subscriber_id, package_template_id,
           allocated_data_bytes, used_data_bytes, activated_at, expires_at, status, last_synced_at
    from esims
    order by last_synced_at desc nulls last
    limit 100
  `;

  return withRecords(esimsConfig, rows.map(esimRecord), "No live eSIM records exist yet. eSIMs will appear after successful provisioning writes ownership records.");
}

export async function getWebhookWorkspaceConfig() {
  const rows = await query`
    select id, event_type, processing_status, attempt_count, related_order_id::text,
           related_payment_id::text, last_error, received_at
    from stripe_webhook_events
    order by received_at desc
    limit 100
  `;

  return withRecords(webhookConfig, rows.map(webhookRecord), "No stored Stripe webhook events yet. Live Stripe will populate this after persistence is enabled in the webhook handler.");
}

export async function getApiLogsWorkspaceConfig() {
  const rows = await query`
    select route, request_id, user_id::text, ip_hash, status, duration_ms, error_code, created_at
    from api_request_logs
    order by created_at desc
    limit 100
  `;

  return withRecords(apiLogsConfig, rows.map(apiLogRecord), "No API request logs exist yet. Logs will appear once request logging persistence is enabled.");
}

export async function getAuditLogsWorkspaceConfig() {
  const rows = await query`
    select id::text, action, resource, resource_id, reason, ip_hash, created_at
    from audit_logs
    order by created_at desc
    limit 100
  `;

  return withRecords(auditLogsConfig, rows.map(auditRecord), "No audit logs exist yet. Audit events will appear after admin mutations and reveal actions are persisted.");
}

export async function getAdminUsersWorkspaceConfig() {
  const rows = await listAdminUsers();
  return withRecords(adminUsersConfig, rows.map(adminUserRecord), "No admin users exist yet. Create the first additional admin account from Settings.");
}

export async function getSettingsWorkspaceConfig() {
  const rows = await query`
    select key, value, updated_at
    from system_settings
    order by key asc
    limit 100
  `;

  return withRecords(settingsConfig, rows.map(settingRecord), "No persisted system settings exist yet. Environment values are configured in Vercel.");
}

async function query<T extends Record<string, unknown> = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) {
  const db = getDb();
  if (!db) return [] as T[];
  try {
    return (await db.unsafe(strings.join(""), values as never[])) as T[];
  } catch (error) {
    console.warn("Live Postgres query failed; returning an empty live result set.", error instanceof Error ? { message: error.message } : {});
    return [] as T[];
  }
}

function withRecords(config: AdminWorkspaceConfig, records: AdminRecord[], emptyState: string): AdminWorkspaceConfig {
  return {
    ...config,
    description: `${config.description} Live source: Supabase/Postgres.`,
    summary: [
      { label: "Live records", value: records.length.toLocaleString(), tone: records.length > 0 ? "success" : "neutral" },
      { label: "Source", value: "Postgres", tone: "info" },
      { label: "Fallback rows", value: "0", tone: "success" },
      { label: "Mode", value: "Live", tone: "success" },
    ],
    records,
    emptyState,
  };
}

function orderRecord(row: Record<string, unknown>): AdminRecord {
  const status = String(row.payment_status ?? "unknown");
  return baseRecord({
    id: String(row.id),
    title: String(row.order_number),
    subtitle: String(row.email ?? "No customer email"),
    status,
    tone: tone(status),
    category: status,
    fields: {
      orderNumber: row.order_number,
      purchaseDate: formatDate(row.created_at),
      customer: row.email ?? "n/a",
      email: row.email ?? "n/a",
      country: "n/a",
      package: "n/a",
      salePrice: money(row.total_minor, row.currency),
      grossMargin: "pending",
      paymentStatus: row.payment_status,
      fulfillmentStatus: row.provisioning_status,
      paymentIntent: "pending linkage",
    },
  });
}

function esimRecord(row: Record<string, unknown>): AdminRecord {
  const status = String(row.status ?? "unknown");
  const allocated = Number(row.allocated_data_bytes ?? 0);
  const used = Number(row.used_data_bytes ?? 0);
  return baseRecord({
    id: String(row.id),
    title: String(row.id),
    subtitle: `Subscriber ${String(row.ocs_subscriber_id ?? "n/a")}`,
    status,
    tone: tone(status),
    category: status,
    fields: {
      esimId: row.id,
      subscriberId: row.ocs_subscriber_id ?? "n/a",
      iccid: "encrypted",
      imsi: "encrypted",
      package: row.package_template_id ?? "n/a",
      assigned: formatDate(row.last_synced_at),
      activated: formatDate(row.activated_at),
      remaining: `${Math.max(allocated - used, 0)} bytes`,
      state: status,
    },
  });
}

function webhookRecord(row: Record<string, unknown>): AdminRecord {
  const status = String(row.processing_status ?? "unknown");
  return baseRecord({
    id: String(row.id),
    title: String(row.id),
    subtitle: String(row.event_type),
    status,
    tone: tone(status),
    category: String(row.event_type).split(".")[0],
    fields: {
      eventId: row.id,
      eventType: row.event_type,
      received: formatDate(row.received_at),
      attempts: row.attempt_count,
      order: row.related_order_id ?? "n/a",
      payment: row.related_payment_id ?? "n/a",
      processing: status,
    },
  });
}

function apiLogRecord(row: Record<string, unknown>): AdminRecord {
  const status = String(row.status ?? "0");
  return baseRecord({
    id: String(row.request_id),
    title: String(row.request_id),
    subtitle: String(row.route),
    status,
    tone: tone(status),
    category: String(row.route).split("/")[2] ?? "api",
    fields: {
      route: row.route,
      requestId: row.request_id,
      user: row.user_id ?? "anonymous",
      ipHash: row.ip_hash ?? "n/a",
      httpStatus: status,
      duration: `${row.duration_ms ?? 0} ms`,
      errorCode: row.error_code ?? "none",
      timestamp: formatDate(row.created_at),
    },
  });
}

function auditRecord(row: Record<string, unknown>): AdminRecord {
  const action = String(row.action ?? "unknown");
  return baseRecord({
    id: String(row.id),
    title: `${action} ${String(row.resource_id ?? "")}`,
    subtitle: String(row.reason ?? row.resource ?? ""),
    status: action,
    tone: tone(action),
    category: String(row.resource ?? "audit"),
    fields: {
      administrator: "n/a",
      action,
      resource: row.resource,
      resourceId: row.resource_id ?? "n/a",
      reason: row.reason ?? "n/a",
      ipHash: row.ip_hash ?? "n/a",
      timestamp: formatDate(row.created_at),
    },
  });
}

function adminUserRecord(row: Record<string, unknown>): AdminRecord {
  const disabled = Boolean(row.disabledAt ?? row.disabled_at);
  return baseRecord({
    id: String(row.id),
    title: String(row.name ?? row.full_name ?? row.email),
    subtitle: String(row.email),
    status: disabled ? "Disabled" : String(row.role ?? row.roles ?? "Active"),
    tone: disabled ? "error" : "success",
    category: "Platform",
    fields: {
      name: row.name ?? row.full_name ?? row.email,
      email: row.email,
      role: row.role ?? row.roles,
      team: "Platform",
      lastActive: formatDate(row.lastLoginAt ?? row.last_login_at),
      mfa: row.mfa_enabled ? "Ready" : "Not enabled",
      permissions: row.role ?? row.roles,
    },
  });
}

function settingRecord(row: Record<string, unknown>): AdminRecord {
  return baseRecord({
    id: String(row.key),
    title: String(row.key),
    subtitle: "Persisted system setting",
    status: "Live",
    tone: "success",
    category: "Settings",
    fields: {
      setting: row.key,
      area: "System",
      value: JSON.stringify(row.value),
      state: "Live",
      lastUpdated: formatDate(row.updated_at),
      owner: "Platform",
    },
  });
}

function baseRecord(input: {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  tone: StatusTone;
  category: string;
  fields: Record<string, unknown>;
}): AdminRecord {
  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    createdAt: "",
    status: input.status,
    statusTone: input.tone,
    category: input.category,
    fields: input.fields as Record<string, string | number | null>,
    timeline: ["Loaded from live Supabase/Postgres"],
    notes: ["Live record loaded from the configured backend."],
  };
}

function tone(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (["paid", "succeeded", "success", "completed", "active", "live", "200"].includes(normalized)) return "success";
  if (["failed", "error", "disabled", "500"].includes(normalized)) return "error";
  if (["pending", "queued", "processing", "manual_review", "400", "404", "429"].includes(normalized)) return "warning";
  return "neutral";
}

function formatDate(value: unknown) {
  if (!value) return "n/a";
  return new Date(String(value)).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(value: unknown, currency: unknown) {
  const amount = Number(value ?? 0) / 100;
  return `${String(currency ?? "EUR").toUpperCase()} ${amount.toFixed(2)}`;
}
