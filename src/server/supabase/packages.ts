import type { AdminRecord, AdminWorkspaceConfig } from "@/components/admin/operations-data";
import { packagesConfig } from "@/components/admin/operations-data";
import { getDb } from "@/server/db/client";

type SupabasePackageRow = {
  id: string;
  content: {
    id?: string;
    data?: string;
    name?: string;
    price?: string;
    hidden?: boolean;
    region?: string;
    duration?: string;
    priority?: number;
    countries?: string[];
    countryIso2?: string[];
    highlighted?: boolean;
    regionGroup?: string;
    packageScope?: string;
    packageTitle?: string;
    locationZoneId?: number;
    locationZoneName?: string;
    prepaidPackageTemplateId?: number;
  };
  created_at: string | null;
};

export async function getLivePackageRecords(limit = 120): Promise<AdminRecord[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db<SupabasePackageRow[]>`
      select id, content, created_at
      from admin_packages
      order by created_at desc
      limit ${limit}
    `;
    return rows.map(mapPackageRow).filter((record) => record.status !== "Hidden");
  } catch (error) {
    console.warn("Live package query failed; returning an empty live package list.", error instanceof Error ? { message: error.message } : {});
    return [];
  }
}

export async function getPackagesWorkspaceConfig(): Promise<AdminWorkspaceConfig> {
  const liveRecords = await getLivePackageRecords();
  const activeCount = liveRecords.filter((record) => record.status === "Active").length;
  const featuredCount = liveRecords.filter((record) => record.fields.featured === "Yes").length;
  const countries = new Set(liveRecords.map((record) => String(record.fields.country)).filter(Boolean));

  return {
    ...packagesConfig,
    description: "Live package catalogue loaded from Supabase admin_packages. Operational writes should be performed from the OCS Creation Panel and persisted through the package sync workflow.",
    summary: [
      { label: "Supabase packages", value: liveRecords.length.toLocaleString(), tone: "success" },
      { label: "Active", value: activeCount.toLocaleString(), tone: "success" },
      { label: "Featured", value: featuredCount.toLocaleString(), tone: "info" },
      { label: "Destinations", value: countries.size.toLocaleString(), tone: "neutral" },
    ],
    records: liveRecords,
    emptyState: "No live Supabase package rows are available.",
  };
}

export async function getPublicPlans() {
  const records = await getLivePackageRecords(240);

  return records.map((record) => ({
    id: record.id,
    displayName: record.fields.displayName,
    country: record.fields.country,
    region: record.fields.locationZoneName ?? record.fields.country,
    dataAllowance: record.fields.allowance,
    validity: record.fields.validity,
    retailPrice: record.fields.retail,
    currency: "EUR",
    templateId: record.fields.templateId,
    active: record.status === "Active",
    featured: record.fields.featured === "Yes",
    source: "supabase",
  }));
}

function mapPackageRow(row: SupabasePackageRow): AdminRecord {
  const content = row.content ?? {};
  const templateId = content.prepaidPackageTemplateId ?? Number(row.id);
  const displayName = content.packageTitle ?? content.name ?? `Package ${row.id}`;
  const countries = toStringArray(content.countries);
  const countryIso2 = toStringArray(content.countryIso2);
  const country = content.region ?? countries[0] ?? content.locationZoneName ?? "Global";
  const hidden = Boolean(content.hidden);
  const featured = Boolean(content.highlighted);
  const status = hidden ? "Hidden" : "Active";

  return {
    id: `pkg_${row.id}`,
    title: displayName,
    subtitle: `${content.data ?? "Data"} / ${content.duration ?? "Validity"} - ${country}`,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown",
    amount: content.price ?? "n/a",
    status,
    statusTone: hidden ? "neutral" : "success",
    category: country,
    fields: {
      packageId: `pkg_${row.id}`,
      templateId,
      displayName,
      country,
      allowance: content.data ?? "n/a",
      validity: content.duration ?? "n/a",
      retail: content.price ?? "n/a",
      cost: "pending OCS cost",
      margin: "pending",
      state: status,
      featured: featured ? "Yes" : "No",
      stripeProduct: "pending Stripe link",
      stripePrice: "pending Stripe link",
      locationZoneId: content.locationZoneId ?? "n/a",
      locationZoneName: content.locationZoneName ?? country,
      regionGroup: content.regionGroup ?? "n/a",
      packageScope: content.packageScope ?? "n/a",
      countries: countries.length > 0 ? countries.join(", ") : country,
      countryIso2: countryIso2.length > 0 ? countryIso2.join(", ") : "n/a",
      priority: content.priority ?? 0,
    },
    timeline: ["Loaded from Supabase admin_packages", "Normalized for InternetKudo admin UI", "Awaiting OCS reseller cost sync", "Awaiting Stripe product mapping"],
    notes: ["Live catalogue row. Operational actions remain local until live write policies and adapters are enabled."],
  };
}

function toStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}
