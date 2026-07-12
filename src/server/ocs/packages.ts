import type { AdminRecord, AdminWorkspaceConfig } from "@/components/admin/operations-data";
import { packagesConfig } from "@/components/admin/operations-data";
import { listPrepaidPackageTemplateCommand } from "@/server/ocs/commands";
import { getEnv } from "@/server/ocs/config";
import { getOcsClient } from "@/server/ocs/client";

type OcsPackageTemplate = {
  prepaidpackagetemplateid?: number;
  prepaidpackagetemplatename?: string;
  resellerid?: number;
  priority?: number;
  locationzoneid?: number;
  destinationzoneid?: number;
  databyte?: number;
  perioddays?: number;
  deleted?: boolean;
  cost?: number;
  uiVisible?: boolean;
  userUiName?: string;
  uiStartAvailablePeriod?: string;
  uiEndAvailibilityPeriod?: string;
  rdbLocationZones?: {
    locationzoneid?: number;
    locationzonename?: string;
  };
  rdbDestinationZones?: {
    destinationzoneid?: number;
    destinationzonename?: string;
  };
  reseller?: {
    resellerid?: number;
    resellername?: string;
  };
  sponsors?: {
    sponsorid?: number;
    sponsorname?: string;
    displayname?: string;
  };
};

export async function getOcsPackagesWorkspaceConfig(): Promise<AdminWorkspaceConfig> {
  try {
    const templates = await getOcsPackageTemplates();
    const records = templates.map(templateRecord);
    const active = records.filter((record) => record.status === "Active").length;
    const archived = records.filter((record) => record.status === "Archived").length;
    const priced = records.filter((record) => record.fields.cost !== "n/a").length;
    const zones = new Set(records.map((record) => String(record.fields.locationZoneName)).filter((value) => value && value !== "n/a"));

    return {
      ...packagesConfig,
      modeLabel: "LIVE",
      primaryAction: "Create package",
      description: "Live OCS prepaid package templates pulled from listPrepaidPackageTemplate. OCS cost is shown as the upstream package price/cost.",
      summary: [
        { label: "OCS templates", value: records.length.toLocaleString(), tone: "success" },
        { label: "Active", value: active.toLocaleString(), tone: "success" },
        { label: "Archived", value: archived.toLocaleString(), tone: archived > 0 ? "warning" : "success" },
        { label: "With OCS price", value: priced.toLocaleString(), tone: "info" },
        { label: "Location zones", value: zones.size.toLocaleString(), tone: "neutral" },
      ],
      records,
      emptyState: "No OCS package templates returned for this reseller.",
      operationsLogTitle: "Live OCS package sync",
      operationsLogDescription: "Rows are read directly from Telco-vision OCS listPrepaidPackageTemplate. Retail pricing and Stripe price links should be stored separately in InternetKudo.",
    };
  } catch (error) {
    console.warn("OCS package template fetch failed; returning an empty live package page.", error instanceof Error ? { message: error.message } : {});
    return {
      ...packagesConfig,
      modeLabel: "LIVE",
      description: "Live OCS package templates could not be loaded.",
      summary: [
        { label: "OCS templates", value: "0", tone: "neutral" },
        { label: "Source", value: "OCS", tone: "info" },
        { label: "Fallback rows", value: "0", tone: "success" },
        { label: "Status", value: "Unavailable", tone: "warning" },
      ],
      records: [],
      emptyState: "OCS package templates could not be loaded.",
    };
  }
}

async function getOcsPackageTemplates(): Promise<OcsPackageTemplate[]> {
  const env = getEnv();
  const resellerId = Number(env.OCS_RESELLER_ID);
  const response = await getOcsClient().executeCommand(listPrepaidPackageTemplateCommand(Number.isFinite(resellerId) ? { resellerId } : {}));
  const value = response.listPrepaidPackageTemplate;
  if (!value || typeof value !== "object") return [];
  const templates = (value as { template?: unknown }).template;
  return Array.isArray(templates) ? templates as OcsPackageTemplate[] : [];
}

function templateRecord(template: OcsPackageTemplate): AdminRecord {
  const id = template.prepaidpackagetemplateid ?? 0;
  const name = template.userUiName || template.prepaidpackagetemplatename || `OCS template ${id}`;
  const locationZoneName = template.rdbLocationZones?.locationzonename ?? "n/a";
  const dataBytes = Number(template.databyte ?? 0);
  const state = template.deleted ? "Archived" : "Active";
  const cost = typeof template.cost === "number" ? formatMoney(template.cost) : "n/a";

  return {
    id: `ocs_tpl_${id}`,
    title: name,
    subtitle: `${formatBytes(dataBytes)} / ${template.perioddays ?? "n/a"} days - ${locationZoneName}`,
    createdAt: template.uiStartAvailablePeriod ? formatDate(template.uiStartAvailablePeriod) : "",
    amount: cost,
    status: state,
    statusTone: template.deleted ? "neutral" : "success",
    category: locationZoneName,
    fields: {
      packageId: `ocs_tpl_${id}`,
      templateId: id,
      displayName: name,
      country: locationZoneName,
      allowance: formatBytes(dataBytes),
      validity: template.perioddays ? `${template.perioddays} days` : "n/a",
      retail: "Set in InternetKudo",
      cost,
      margin: "Requires retail price",
      state,
      ocsPrice: cost,
      locationZoneId: template.locationzoneid ?? template.rdbLocationZones?.locationzoneid ?? "n/a",
      locationZoneName,
      destinationZoneId: template.destinationzoneid ?? template.rdbDestinationZones?.destinationzoneid ?? "n/a",
      destinationZoneName: template.rdbDestinationZones?.destinationzonename ?? "n/a",
      resellerId: template.resellerid ?? template.reseller?.resellerid ?? "n/a",
      resellerName: template.reseller?.resellername ?? "n/a",
      sponsor: template.sponsors?.displayname ?? template.sponsors?.sponsorname ?? "n/a",
      priority: template.priority ?? "n/a",
      visibleInOcsUi: template.uiVisible ? "Yes" : "No",
    },
    timeline: ["Pulled from OCS listPrepaidPackageTemplate", "OCS cost captured from template.cost", "Retail and Stripe price mapping remain separate InternetKudo data"],
    notes: ["Live OCS package template. Do not expose raw upstream objects to the mobile app."],
  };
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "n/a";
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${Number(gb.toFixed(gb >= 10 ? 0 : 1))} GB`;
  const mb = bytes / 1024 / 1024;
  return `${Math.round(mb)} MB`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
