import "server-only";

import { getDb } from "@/server/db/client";
import type { AdminApiGroup, AdminPageKey } from "@/lib/admin/pages";
import { listResellerAccountCommand } from "@/server/ocs/commands";
import { getOcsClient } from "@/server/ocs/client";

export type SubresellerProfile = {
  id: string;
  name: string;
  active: boolean;
  ocsResellerId: number;
  ocsAccountId: number | null;
  stripeProfileId: string;
  stripeAccountId: string | null;
  apiProfileId: string | null;
  apiProfileName: string;
  rateLimitPerMinute: number;
  adminEmail: string | null;
  allowedDashboardPages: AdminPageKey[];
  allowedApiGroups: AdminApiGroup[];
  canViewCosts: boolean;
  canIssueRefunds: boolean;
  canRevealEsimSecrets: boolean;
  notes: string | null;
  topupCount: number;
  topupGrossMinor: number;
  topupStripeFeeMinor: number;
  topupNetCreditedMinor: number;
  createdAt: string;
  updatedAt: string;
};

export type OcsResellerAccount = {
  localResellerId: string | null;
  ocsResellerId: number;
  name: string;
  balance: string | number | null;
  accounts: Array<{
    localAccountId: string | null;
    ocsAccountId: number;
    name: string | null;
    balance: string | number | null;
    packageOnly: boolean;
  }>;
};

export type SubresellerInput = {
  id?: string;
  name: string;
  active: boolean;
  ocsResellerId: number;
  ocsAccountId?: number | null;
  stripeProfileId: string;
  stripeAccountId?: string | null;
  adminEmail?: string | null;
  allowedDashboardPages: AdminPageKey[];
  allowedApiGroups: AdminApiGroup[];
  rateLimitPerMinute: number;
  canViewCosts: boolean;
  canIssueRefunds: boolean;
  canRevealEsimSecrets: boolean;
  notes?: string | null;
};

export async function listSubresellerProfiles(): Promise<SubresellerProfile[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db`
    select
      r.id::text,
      r.name,
      r.active,
      r.ocs_reseller_id,
      r.default_ocs_account_id,
      r.stripe_profile_id,
      r.stripe_account_id,
      r.created_at,
      r.updated_at,
      p.id::text as api_profile_id,
      p.name as api_profile_name,
      p.rate_limit_per_minute,
      p.config,
      a.admin_email,
      a.allowed_dashboard_pages,
      a.allowed_api_groups,
      a.can_view_costs,
      a.can_issue_refunds,
      a.can_reveal_esim_secrets,
      a.active as access_active,
      coalesce(t.topup_count, 0)::int as topup_count,
      coalesce(t.topup_gross_minor, 0)::int as topup_gross_minor,
      coalesce(t.topup_stripe_fee_minor, 0)::int as topup_stripe_fee_minor,
      coalesce(t.topup_net_credited_minor, 0)::int as topup_net_credited_minor
    from resellers r
    left join reseller_api_profiles p on p.reseller_id = r.id and p.name = 'default'
    left join reseller_admin_access_policies a on a.reseller_id = r.id
    left join lateral (
      select
        count(*) filter (where payment_status = 'succeeded') as topup_count,
        sum(amount_minor) filter (where payment_status = 'succeeded') as topup_gross_minor,
        sum(stripe_fee_minor) filter (where payment_status = 'succeeded') as topup_stripe_fee_minor,
        sum(net_amount_minor) filter (where ocs_status = 'applied') as topup_net_credited_minor
      from subreseller_topups
      where reseller_id = r.id
    ) t on true
    order by r.created_at desc
  `;

  return rows.map(subresellerFromRow);
}

export async function syncSubresellersFromOcs(): Promise<OcsResellerAccount[]> {
  const response = await getOcsClient().executeCommand(listResellerAccountCommand());
  const ocsResellers = normalizeOcsResellerAccounts(response);
  const db = getDb();
  if (!db) return ocsResellers;

  const synced: OcsResellerAccount[] = [];

  for (const reseller of ocsResellers) {
    const defaultAccount = reseller.accounts[0] ?? null;
    const [localReseller] = await db`
      insert into resellers (name, ocs_reseller_id, default_ocs_account_id, stripe_profile_id, active, config)
      values (
        ${reseller.name},
        ${reseller.ocsResellerId},
        ${defaultAccount?.ocsAccountId ?? null},
        'internetkudo-platform',
        true,
        ${JSON.stringify({ source: "ocs_listResellerAccount", lastOcsSyncAt: new Date().toISOString() })}::jsonb
      )
      on conflict (ocs_reseller_id) do update set
        name = excluded.name,
        default_ocs_account_id = coalesce(resellers.default_ocs_account_id, excluded.default_ocs_account_id),
        config = coalesce(resellers.config, '{}'::jsonb) || excluded.config,
        updated_at = now()
      returning id::text
    `;

    const accounts = [];
    for (const account of reseller.accounts) {
      const [localAccount] = await db`
        insert into reseller_accounts (reseller_id, ocs_account_id, name, balance, active, raw_payload, last_synced_at)
        values (
          ${localReseller.id},
          ${account.ocsAccountId},
          ${account.name},
          ${parseDecimal(account.balance)},
          true,
          ${JSON.stringify(account)}::jsonb,
          now()
        )
        on conflict (reseller_id, ocs_account_id) do update set
          name = excluded.name,
          balance = excluded.balance,
          active = true,
          raw_payload = excluded.raw_payload,
          last_synced_at = now(),
          updated_at = now()
        returning id::text
      `;

      accounts.push({ ...account, localAccountId: String(localAccount.id) });
    }

    synced.push({ ...reseller, localResellerId: String(localReseller.id), accounts });
  }

  return synced;
}

export async function getAdminAccessPolicy(email: string) {
  const db = getDb();
  if (!db) return null;

  const rows = await db`
    select
      a.admin_email,
      a.allowed_dashboard_pages,
      a.allowed_api_groups,
      a.can_view_costs,
      a.can_issue_refunds,
      a.can_reveal_esim_secrets,
      a.active,
      r.id::text as reseller_id,
      r.name as reseller_name,
      r.ocs_reseller_id,
      r.default_ocs_account_id,
      r.stripe_profile_id,
      r.stripe_account_id,
      p.rate_limit_per_minute
    from reseller_admin_access_policies a
    join resellers r on r.id = a.reseller_id
    left join reseller_api_profiles p on p.reseller_id = r.id and p.name = 'default'
    where lower(a.admin_email) = lower(${email})
      and a.active = true
      and r.active = true
    order by a.updated_at desc
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    adminEmail: String(row.admin_email),
    resellerId: String(row.reseller_id),
    resellerName: String(row.reseller_name),
    ocsResellerId: Number(row.ocs_reseller_id),
    ocsAccountId: nullableNumber(row.default_ocs_account_id),
    stripeProfileId: String(row.stripe_profile_id ?? "internetkudo-platform"),
    stripeAccountId: nullableString(row.stripe_account_id),
    rateLimitPerMinute: Number(row.rate_limit_per_minute ?? 120),
    allowedDashboardPages: stringArray(row.allowed_dashboard_pages) as AdminPageKey[],
    allowedApiGroups: stringArray(row.allowed_api_groups) as AdminApiGroup[],
    canViewCosts: Boolean(row.can_view_costs),
    canIssueRefunds: Boolean(row.can_issue_refunds),
    canRevealEsimSecrets: Boolean(row.can_reveal_esim_secrets),
  };
}

export async function updateSubresellerStripeAccount(input: {
  resellerId: string;
  stripeAccountId: string;
  stripeProfileId?: string | null;
}) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const stripeAccountId = input.stripeAccountId.trim();
  if (!stripeAccountId) throw new Error("Stripe account ID is required.");

  const stripeProfileId = input.stripeProfileId?.trim() || "internetkudo-connect";

  await db.begin(async (tx) => {
    await tx`
      update resellers
      set stripe_account_id = ${stripeAccountId},
          stripe_profile_id = ${stripeProfileId},
          config = coalesce(config, '{}'::jsonb) || ${JSON.stringify({
            stripeConnectedAt: new Date().toISOString(),
            stripeConnectionType: "connect",
          })}::jsonb,
          updated_at = now()
      where id = ${input.resellerId}
    `;

    await tx`
      update reseller_api_profiles
      set stripe_profile_id = ${stripeProfileId},
          config = coalesce(config, '{}'::jsonb) || ${JSON.stringify({
            stripeAccountId,
            stripeConnectedAt: new Date().toISOString(),
          })}::jsonb,
          updated_at = now()
      where reseller_id = ${input.resellerId}
        and name = 'default'
    `;
  });
}

export async function upsertSubresellerProfile(input: SubresellerInput): Promise<SubresellerProfile> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const cleanAdminEmail = input.adminEmail?.trim().toLowerCase() || null;
  const cleanStripeAccountId = input.stripeAccountId?.trim() || null;
  const cleanNotes = input.notes?.trim() || null;

  const rows = await db.begin(async (tx) => {
    const [reseller] = input.id
      ? await tx`
          update resellers
          set name = ${input.name},
              ocs_reseller_id = ${input.ocsResellerId},
              default_ocs_account_id = ${input.ocsAccountId ?? null},
              stripe_profile_id = ${input.stripeProfileId},
              stripe_account_id = ${cleanStripeAccountId},
              active = ${input.active},
              config = coalesce(config, '{}'::jsonb) || ${JSON.stringify({ notes: cleanNotes, mode: "subreseller" })}::jsonb,
              updated_at = now()
          where id = ${input.id}
          returning *
        `
      : await tx`
          insert into resellers (name, ocs_reseller_id, default_ocs_account_id, stripe_profile_id, stripe_account_id, active, config)
          values (
            ${input.name},
            ${input.ocsResellerId},
            ${input.ocsAccountId ?? null},
            ${input.stripeProfileId},
            ${cleanStripeAccountId},
            ${input.active},
            ${JSON.stringify({ notes: cleanNotes, mode: "subreseller" })}::jsonb
          )
          on conflict (ocs_reseller_id) do update set
            name = excluded.name,
            default_ocs_account_id = excluded.default_ocs_account_id,
            stripe_profile_id = excluded.stripe_profile_id,
            stripe_account_id = excluded.stripe_account_id,
            active = excluded.active,
            config = coalesce(resellers.config, '{}'::jsonb) || excluded.config,
            updated_at = now()
          returning *
        `;

    await tx`
      insert into reseller_api_profiles (
        reseller_id,
        name,
        ocs_reseller_id,
        ocs_account_id,
        stripe_profile_id,
        enabled,
        rate_limit_per_minute,
        config
      )
      values (
        ${reseller.id},
        'default',
        ${input.ocsResellerId},
        ${input.ocsAccountId ?? null},
        ${input.stripeProfileId},
        ${input.active},
        ${input.rateLimitPerMinute},
        ${JSON.stringify({
          allowedDashboardPages: input.allowedDashboardPages,
          allowedApiGroups: input.allowedApiGroups,
          stripeAccountId: cleanStripeAccountId,
          notes: cleanNotes,
        })}::jsonb
      )
      on conflict (reseller_id, name) do update set
        ocs_reseller_id = excluded.ocs_reseller_id,
        ocs_account_id = excluded.ocs_account_id,
        stripe_profile_id = excluded.stripe_profile_id,
        enabled = excluded.enabled,
        rate_limit_per_minute = excluded.rate_limit_per_minute,
        config = excluded.config,
        updated_at = now()
    `;

    if (cleanAdminEmail) {
      await tx`
        insert into reseller_admin_access_policies (
          reseller_id,
          admin_email,
          label,
          allowed_dashboard_pages,
          allowed_api_groups,
          can_view_costs,
          can_issue_refunds,
          can_reveal_esim_secrets,
          active,
          config
        )
        values (
          ${reseller.id},
          ${cleanAdminEmail},
          ${input.name},
          ${input.allowedDashboardPages},
          ${input.allowedApiGroups},
          ${input.canViewCosts},
          ${input.canIssueRefunds},
          ${input.canRevealEsimSecrets},
          ${input.active},
          ${JSON.stringify({ notes: cleanNotes })}::jsonb
        )
        on conflict (reseller_id, admin_email) do update set
          label = excluded.label,
          allowed_dashboard_pages = excluded.allowed_dashboard_pages,
          allowed_api_groups = excluded.allowed_api_groups,
          can_view_costs = excluded.can_view_costs,
          can_issue_refunds = excluded.can_issue_refunds,
          can_reveal_esim_secrets = excluded.can_reveal_esim_secrets,
          active = excluded.active,
          config = excluded.config,
          updated_at = now()
      `;
    }

    return tx`
      select
        r.id::text,
        r.name,
        r.active,
        r.ocs_reseller_id,
        r.default_ocs_account_id,
        r.stripe_profile_id,
        r.stripe_account_id,
        r.created_at,
        r.updated_at,
        p.id::text as api_profile_id,
        p.name as api_profile_name,
        p.rate_limit_per_minute,
        p.config,
        a.admin_email,
        a.allowed_dashboard_pages,
        a.allowed_api_groups,
        a.can_view_costs,
        a.can_issue_refunds,
        a.can_reveal_esim_secrets,
        a.active as access_active
      from resellers r
      left join reseller_api_profiles p on p.reseller_id = r.id and p.name = 'default'
      left join reseller_admin_access_policies a on a.reseller_id = r.id
      where r.id = ${reseller.id}
      order by a.updated_at desc nulls last
      limit 1
    `;
  });

  return subresellerFromRow(rows[0]);
}

function subresellerFromRow(row: Record<string, unknown>): SubresellerProfile {
  const config = objectValue(row.config);
  return {
    id: String(row.id),
    name: String(row.name),
    active: Boolean(row.active),
    ocsResellerId: Number(row.ocs_reseller_id),
    ocsAccountId: nullableNumber(row.default_ocs_account_id),
    stripeProfileId: String(row.stripe_profile_id ?? "internetkudo-platform"),
    stripeAccountId: nullableString(row.stripe_account_id) ?? nullableString(config.stripeAccountId),
    apiProfileId: nullableString(row.api_profile_id),
    apiProfileName: String(row.api_profile_name ?? "default"),
    rateLimitPerMinute: Number(row.rate_limit_per_minute ?? 120),
    adminEmail: nullableString(row.admin_email),
    allowedDashboardPages: stringArray(row.allowed_dashboard_pages ?? config.allowedDashboardPages) as AdminPageKey[],
    allowedApiGroups: stringArray(row.allowed_api_groups ?? config.allowedApiGroups) as AdminApiGroup[],
    canViewCosts: Boolean(row.can_view_costs),
    canIssueRefunds: Boolean(row.can_issue_refunds),
    canRevealEsimSecrets: Boolean(row.can_reveal_esim_secrets),
    notes: nullableString(config.notes),
    topupCount: Number(row.topup_count ?? 0),
    topupGrossMinor: Number(row.topup_gross_minor ?? 0),
    topupStripeFeeMinor: Number(row.topup_stripe_fee_minor ?? 0),
    topupNetCreditedMinor: Number(row.topup_net_credited_minor ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function nullableNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeOcsResellerAccounts(response: Record<string, unknown>): OcsResellerAccount[] {
  const root = response.listResellerAccount;
  const resellers = root && typeof root === "object" && Array.isArray((root as { reseller?: unknown }).reseller)
    ? (root as { reseller: unknown[] }).reseller
    : [];

  return resellers.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const ocsResellerId = Number(record.id);
    if (!Number.isFinite(ocsResellerId) || ocsResellerId <= 0) return [];

    const rawAccounts = Array.isArray(record.account) ? record.account : [];
    return [{
      localResellerId: null,
      ocsResellerId,
      name: String(record.name ?? `OCS Reseller ${ocsResellerId}`),
      balance: stringOrNumber(record.resellerBalance ?? record.balance),
      accounts: rawAccounts.flatMap((account) => {
        if (!account || typeof account !== "object") return [];
        const accountRecord = account as Record<string, unknown>;
        const ocsAccountId = Number(accountRecord.id);
        if (!Number.isFinite(ocsAccountId) || ocsAccountId <= 0) return [];
        return [{
          localAccountId: null,
          ocsAccountId,
          name: nullableString(accountRecord.name),
          balance: stringOrNumber(accountRecord.balance),
          packageOnly: Boolean(accountRecord.packageOnly),
        }];
      }),
    }];
  });
}

function stringOrNumber(value: unknown): string | number | null {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function parseDecimal(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
