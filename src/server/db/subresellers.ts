import "server-only";

import { getDb } from "@/server/db/client";
import type { AdminApiGroup, AdminPageKey } from "@/lib/admin/pages";

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
  createdAt: string;
  updatedAt: string;
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
      a.active as access_active
    from resellers r
    left join reseller_api_profiles p on p.reseller_id = r.id and p.name = 'default'
    left join reseller_admin_access_policies a on a.reseller_id = r.id
    order by r.created_at desc
  `;

  return rows.map(subresellerFromRow);
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
