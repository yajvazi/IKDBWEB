import "server-only";

import {
  esimStatusPerAccountCommand,
  getCustomerTariffCommand,
  getResellerInfoCommand,
  listResellerTariffCommand,
  listSponsorCommand,
  listSteeringListCommand,
  listSubscriberTariffCommand,
  listTariffRuleCommand,
} from "@/server/ocs/commands";
import { getOcsClient } from "@/server/ocs/client";

export type OcsDashboardStats = {
  resellerId: number;
  accountId: number | null;
  reseller: {
    id: number | null;
    name: string;
    parentId: number | null;
    balanceLabel: string;
    mobilePlan: string;
    voipPlan: string;
  };
  esim: {
    accounts: number;
    sponsors: number;
    free: number;
    affected: number;
    total: number;
    statuses: Array<{ label: string; count: number }>;
  };
  network: {
    sponsors: number;
    steeringLists: number;
  };
  tariffs: {
    resellerTariffs: number;
    subscriberTariffs: number;
    customerRules: number;
    sampledTariffRules: number;
    activeCustomerRules: number;
    averageCustomerDataRate: string;
    firstResellerTariff: string;
    firstSubscriberTariff: string;
  };
  warnings: string[];
};

type OcsScope = {
  resellerId?: number | null;
  accountId?: number | null;
};

export async function getOcsDashboardStats(scope: OcsScope = {}): Promise<OcsDashboardStats> {
  const resellerId = normalizePositiveNumber(scope.resellerId ?? process.env.OCS_RESELLER_ID) ?? 567;
  const accountId = normalizePositiveNumber(scope.accountId ?? process.env.OCS_API_ACCOUNT_ID);

  const [resellerInfo, esimStatus, sponsors, steeringLists, resellerTariffs, subscriberTariffs, customerTariff] = await Promise.all([
    safeOcsCall("getResellerInfo", () => getOcsClient().executeCommand(getResellerInfoCommand({ id: resellerId }))),
    safeOcsCall("esimStatusPerAccount", () => getOcsClient().executeCommand(esimStatusPerAccountCommand(accountId ? { accountId } : { resellerId }))),
    safeOcsCall("listSponsor", () => getOcsClient().executeCommand(listSponsorCommand(resellerId))),
    safeOcsCall("listSteeringList", () => getOcsClient().executeCommand(listSteeringListCommand(resellerId))),
    safeOcsCall("listResellerTariff", () => getOcsClient().executeCommand(listResellerTariffCommand({ resellerId }))),
    safeOcsCall("listSubscriberTariff", () => getOcsClient().executeCommand(listSubscriberTariffCommand({ resellerId }))),
    safeOcsCall("getCustomerTariff", () => getOcsClient().executeCommand(getCustomerTariffCommand(resellerId))),
  ]);

  const resellerTariffItems = tariffArray(resellerTariffs.data?.listResellerTariff);
  const subscriberTariffItems = tariffArray(subscriberTariffs.data?.listSubscriberTariff);
  const sampleTariffIds = Array.from(new Set([...resellerTariffItems, ...subscriberTariffItems].map((item) => normalizePositiveNumber(item.roamingplanid)).filter(isNumber))).slice(0, 2);
  const sampledRules = await Promise.all(sampleTariffIds.map((id) => safeOcsCall(`listTariffRule:${id}`, () => getOcsClient().executeCommand(listTariffRuleCommand(id)))));
  const sampledRuleItems = sampledRules.flatMap((result) => ruleArray(result.data?.listTariffRule));
  const customerRuleItems = ruleArray(customerTariff.data?.listTariffRule);

  const warnings = [
    ...[resellerInfo, esimStatus, sponsors, steeringLists, resellerTariffs, subscriberTariffs, customerTariff, ...sampledRules]
      .filter((result) => !result.ok)
      .map((result) => `${result.label}: ${result.error}`),
  ];

  return {
    resellerId,
    accountId,
    reseller: normalizeResellerInfo(resellerInfo.data?.getResellerInfo),
    esim: normalizeEsimStatus(esimStatus.data?.esimStatusPerAccount),
    network: {
      sponsors: sponsorArray(sponsors.data?.listSponsor).length,
      steeringLists: steeringArray(steeringLists.data?.listSteeringList).length,
    },
    tariffs: {
      resellerTariffs: resellerTariffItems.length,
      subscriberTariffs: subscriberTariffItems.length,
      customerRules: customerRuleItems.length,
      sampledTariffRules: sampledRuleItems.length,
      activeCustomerRules: customerRuleItems.filter((rule) => rule.active !== false).length,
      averageCustomerDataRate: averageRateLabel(customerRuleItems),
      firstResellerTariff: tariffName(resellerTariffItems[0]),
      firstSubscriberTariff: tariffName(subscriberTariffItems[0]),
    },
    warnings,
  };
}

async function safeOcsCall(label: string, run: () => Promise<Record<string, unknown>>) {
  try {
    return { ok: true as const, label, data: await run(), error: null };
  } catch (error) {
    return { ok: false as const, label, data: null, error: error instanceof Error ? error.message : "Unavailable" };
  }
}

function normalizeResellerInfo(value: unknown): OcsDashboardStats["reseller"] {
  const record = objectValue(value);
  const chargingInfo = objectValue(record.chargingInfo);
  const mobilePlan = objectValue(chargingInfo.mobilePlan);
  const voipPlan = objectValue(chargingInfo.voipPlan);

  return {
    id: normalizePositiveNumber(record.id),
    name: stringValue(record.name) || "OCS reseller",
    parentId: normalizeNumber(record.parentId),
    balanceLabel: formatOcsBalance(record.balance),
    mobilePlan: stringValue(mobilePlan.name) || numberLabel(mobilePlan.id) || "n/a",
    voipPlan: stringValue(voipPlan.name) || numberLabel(voipPlan.id) || "n/a",
  };
}

function normalizeEsimStatus(value: unknown): OcsDashboardStats["esim"] {
  const accounts = arrayValue(objectValue(value).account).map(objectValue);
  const statusTotals = new Map<string, number>();
  let sponsors = 0;

  for (const account of accounts) {
    const accountSponsors = arrayValue(account.sponsor).map(objectValue);
    sponsors += accountSponsors.length;
    for (const sponsor of accountSponsors) {
      const statuses = arrayValue(objectValue(objectValue(sponsor.esim).status ? sponsor.esim : {}).status).map(objectValue);
      for (const status of statuses) {
        const label = stringValue(status.statusStr) || numberLabel(status.statusNum) || "Unknown";
        statusTotals.set(label, (statusTotals.get(label) ?? 0) + (normalizeNumber(status.count) ?? 0));
      }
    }
  }

  const statuses = Array.from(statusTotals.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const free = statusTotals.get("Free") ?? 0;
  const affected = statusTotals.get("Affected") ?? 0;

  return {
    accounts: accounts.length,
    sponsors,
    free,
    affected,
    total: statuses.reduce((sum, status) => sum + status.count, 0),
    statuses,
  };
}

function sponsorArray(value: unknown) {
  return arrayValue(objectValue(value).sponsor).map(objectValue);
}

function steeringArray(value: unknown) {
  return arrayValue(value).map(objectValue);
}

function tariffArray(value: unknown) {
  return arrayValue(objectValue(value).tariff).map(objectValue);
}

function ruleArray(value: unknown) {
  return arrayValue(objectValue(value).rule).map(objectValue);
}

function tariffName(value: Record<string, unknown> | undefined) {
  if (!value) return "n/a";
  return stringValue(value.roamingplanname) || numberLabel(value.roamingplanid) || "n/a";
}

function averageRateLabel(rules: Array<Record<string, unknown>>) {
  const rates = rules.map((rule) => normalizeNumber(rule.datarate)).filter(isNumber);
  if (!rates.length) return "n/a";
  const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  return `${average.toFixed(4)} / MB`;
}

function formatOcsBalance(value: unknown) {
  const parsed = normalizeNumber(value);
  if (parsed === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parsed);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizePositiveNumber(value: unknown) {
  const parsed = normalizeNumber(value);
  return parsed && parsed > 0 ? parsed : null;
}

function normalizeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function numberLabel(value: unknown) {
  const parsed = normalizeNumber(value);
  return parsed === null ? null : String(parsed);
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
