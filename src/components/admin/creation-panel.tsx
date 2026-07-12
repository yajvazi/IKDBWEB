"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clipboard,
  Download,
  FileJson2,
  Network,
  PackagePlus,
  QrCode,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildOcsCommand, ocsCommandCatalog, ocsCommandGroups, type OcsCommandSafety } from "@/lib/ocs/catalog";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type TabKey = "assign" | "template" | "location" | "qr" | "catalog";
type OcsOverview = {
  mode: "mock" | "live";
  resellerId: number;
  resellerAccounts?: Record<string, unknown>;
  resellerInfo?: Record<string, unknown>;
  networkProfiles?: Record<string, unknown>;
  locationZones?: Record<string, unknown>;
  destinationLists?: Record<string, unknown>;
  packageTemplates?: Record<string, unknown>;
};

type ResellerAccount = {
  id?: number;
  name?: string;
  balance?: number | string;
  packageOnly?: boolean;
};

type ResellerWithAccounts = {
  id?: number;
  name?: string;
  balance?: number | string;
  resellerBalance?: number | string;
  resellerInfo?: {
    balance?: number | string;
    [key: string]: unknown;
  } | null;
  account?: ResellerAccount[];
};

const tabs: { key: TabKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "assign", label: "Assign Package", icon: Send },
  { key: "template", label: "Create Package", icon: PackagePlus },
  { key: "location", label: "Location Zone", icon: Network },
  { key: "qr", label: "QR Codes", icon: QrCode },
  { key: "catalog", label: "OCS APIs", icon: FileJson2 },
];

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as T;
}

function jsonString(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function readArray(source: Record<string, unknown> | undefined, key: string): Record<string, unknown>[] {
  const value = source?.[key];
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object" && "template" in value && Array.isArray((value as { template?: unknown }).template)) {
    return (value as { template: Record<string, unknown>[] }).template;
  }
  return [];
}

function commandPayload<T extends Record<string, unknown>>(command: unknown, key: string): T {
  return (command as Record<string, T>)[key];
}

function readResellers(source: Record<string, unknown> | undefined): ResellerWithAccounts[] {
  const value = source?.listResellerAccount;
  if (!value || typeof value !== "object") return [];
  const reseller = (value as { reseller?: unknown }).reseller;
  return Array.isArray(reseller) ? reseller as ResellerWithAccounts[] : [];
}

function formatBalance(value: unknown) {
  if (value === null || value === undefined || value === "") return "n/a";
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parsed);
}

function normalizePackageTemplateName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function safetyClass(safety: OcsCommandSafety) {
  if (safety === "read") return "border-blue-100 bg-blue-50 text-blue-700";
  if (safety === "write") return "border-lime-200 bg-lime-50 text-green-700";
  return "border-red-100 bg-red-50 text-red-700";
}

function PanelCard({ title, description, children, className }: { title: string; description: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-white shadow-sm", className)}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </label>
  );
}

function CommandPreview({ command, onQrText }: { command: unknown; onQrText?: (value: string) => void }) {
  const [copied, setCopied] = useState(false);
  const text = jsonString(command);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
          <FileJson2 className="h-4 w-4 text-lime-300" />
          OCS request JSON
        </div>
        <div className="flex items-center gap-2">
          {onQrText ? (
            <Button type="button" size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => onQrText(text)}>
              <QrCode className="h-4 w-4" />
              QR
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={copy}>
            {copied ? <CheckCircle2 className="h-4 w-4 text-lime-300" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-relaxed text-slate-100">{text}</pre>
    </div>
  );
}

function InventoryList({
  title,
  rows,
  idKey,
  nameKey,
  empty,
}: {
  title: string;
  rows: Record<string, unknown>[];
  idKey: string;
  nameKey: string;
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{rows.length}</span>
      </div>
      <div className="max-h-72 overflow-auto p-2">
        {rows.length === 0 ? (
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">{empty}</div>
        ) : (
          rows.slice(0, 30).map((row, index) => (
            <div key={`${String(row[idKey] ?? index)}-${index}`} className="rounded-md px-3 py-2 hover:bg-blue-50">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-800">{String(row[nameKey] ?? row.name ?? "Unnamed")}</span>
                <span className="font-mono text-xs text-slate-500">{String(row[idKey] ?? row.id ?? "n/a")}</span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                {row.reseller && typeof row.reseller === "object" ? String((row.reseller as Record<string, unknown>).name ?? "") : String(row.resellerName ?? row.countryName ?? "")}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ResellerBalanceList({
  resellers,
  selectedResellerId,
  onSelect,
}: {
  resellers: ResellerWithAccounts[];
  selectedResellerId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-white shadow-sm xl:col-span-4">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Resellers and Account Balances</h2>
          <p className="mt-1 text-xs text-slate-500">Pulled from OCS listResellerAccount. Select the reseller used for package templates and inventory reads.</p>
        </div>
        <select
          aria-label="Selected reseller"
          value={selectedResellerId}
          onChange={(event) => onSelect(event.target.value)}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          {resellers.map((reseller) => (
            <option key={String(reseller.id)} value={String(reseller.id)}>
              {reseller.name ?? "Reseller"} #{reseller.id}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {resellers.length === 0 ? (
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">No reseller accounts loaded yet.</div>
        ) : (
          resellers.map((reseller) => {
            const accounts = Array.isArray(reseller.account) ? reseller.account : [];
            const accountTotal = accounts.reduce((sum, account) => sum + (Number(String(account.balance ?? 0).replace(",", ".")) || 0), 0);
            const resellerBalance = reseller.resellerBalance ?? reseller.resellerInfo?.balance ?? reseller.balance;
            const active = String(reseller.id) === selectedResellerId;
            return (
              <article key={String(reseller.id)} className={cn("rounded-lg border p-4", active ? "border-primary bg-blue-50" : "border-border bg-slate-50")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{reseller.name ?? "Reseller"}</div>
                    <div className="mt-1 font-mono text-xs text-slate-500">ID {String(reseller.id ?? "n/a")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold uppercase text-slate-500">Reseller balance</div>
                    <div className="mt-1 text-sm font-bold text-green-700">{formatBalance(resellerBalance)}</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500">Accounts: {formatBalance(accountTotal)}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {accounts.map((account) => (
                    <div key={String(account.id)} className="rounded-md border border-border bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-slate-700">{account.name ?? "Account"}</span>
                        <span className="font-mono text-xs text-slate-500">#{String(account.id ?? "n/a")}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-500">{account.packageOnly ? "Package-only" : "Balance account"}</span>
                        <span className="font-bold text-slate-900">{formatBalance(account.balance)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export function CreationPanel({ resellerId }: { resellerId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("assign");
  const [qrInput, setQrInput] = useState("LPA:1$smdp.example.net$ACTIVATION_CODE");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [liveStatus, setLiveStatus] = useState("");
  const [overview, setOverview] = useState<OcsOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [submittingAction, setSubmittingAction] = useState("");
  const [locationReason, setLocationReason] = useState("Create sellable InternetKudo location zone");
  const [locationConfirmation, setLocationConfirmation] = useState("");
  const [templateReason, setTemplateReason] = useState("Create sellable InternetKudo package template");
  const [selectedResellerId, setSelectedResellerId] = useState(resellerId);

  const [identifierType, setIdentifierType] = useState("subscriberId");
  const [identifier, setIdentifier] = useState("1000");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [packageTemplateId, setPackageTemplateId] = useState("553");
  const [validityPeriod, setValidityPeriod] = useState("");
  const [activeStart, setActiveStart] = useState("");
  const [activeEnd, setActiveEnd] = useState("");

  const [templateName, setTemplateName] = useState("InternetKudo Global Connect 10GB");
  const [templateLocationZoneId, setTemplateLocationZoneId] = useState("");
  const [locationZoneSearch, setLocationZoneSearch] = useState("");
  const [templateDestinationZoneId, setTemplateDestinationZoneId] = useState("");
  const [templateDataGb, setTemplateDataGb] = useState("10");
  const [templateValidityDays, setTemplateValidityDays] = useState("30");
  const [templateCost, setTemplateCost] = useState("");
  const [templateRecurring, setTemplateRecurring] = useState(false);
  const [templateThrottling, setTemplateThrottling] = useState(false);

  const [networkProfileId, setNetworkProfileId] = useState("");
  const [locationZoneName, setLocationZoneName] = useState("InternetKudo Zone");
  const [tadigs, setTadigs] = useState("AZER1\nQWER1");

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogGroup, setCatalogGroup] = useState("All");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrInput || " ", {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 288,
      color: { dark: "#111827", light: "#FFFFFF" },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrInput]);

  useEffect(() => {
    void loadOverview(false);
    // Initial inventory load only; reseller changes are handled by changeSelectedReseller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const packageAssignmentCommand = useMemo(() => {
    const subscriberValue = identifierType === "subscriberId" ? numberOrUndefined(identifier) : identifier.trim();
    if (identifierType === "accountForSubs") {
      return buildOcsCommand("affectPackageToSubscriber", cleanObject({
        packageTemplateId: numberOrUndefined(packageTemplateId),
        accountForSubs: numberOrUndefined(selectedAccountId),
        validityPeriod: numberOrUndefined(validityPeriod),
        activePeriod: activeStart && activeEnd ? { start: activeStart, end: activeEnd } : undefined,
      }));
    }
    const payload = cleanObject({
      packageTemplateId: numberOrUndefined(packageTemplateId),
      subscriber: subscriberValue ? { [identifierType]: subscriberValue } : undefined,
      validityPeriod: numberOrUndefined(validityPeriod),
      activePeriod: activeStart && activeEnd ? { start: activeStart, end: activeEnd } : undefined,
    });
    return buildOcsCommand("affectPackageToSubscriber", payload);
  }, [activeEnd, activeStart, identifier, identifierType, packageTemplateId, selectedAccountId, validityPeriod]);

  const packageTemplateCommand = useMemo(() => {
    const dataGb = numberOrUndefined(templateDataGb);
    const payload = cleanObject({
      prepaidpackagetemplatename: templateName,
      resellerid: numberOrUndefined(selectedResellerId),
      locationzoneid: numberOrUndefined(templateLocationZoneId),
      destinationzoneid: numberOrUndefined(templateDestinationZoneId),
      databyte: dataGb ? Math.round(dataGb * 1024 * 1024 * 1024) : undefined,
      perioddays: numberOrUndefined(templateValidityDays),
      cost: numberOrUndefined(templateCost),
      throttlingActive: templateThrottling,
      throttlingErrorAction: templateThrottling ? 1 : undefined,
      recurring: templateRecurring,
      nbOccurrence: templateRecurring ? 12 : undefined,
      recurringPeriodicityType: templateRecurring ? 2 : undefined,
      recurringPeriodicityFrequency: templateRecurring ? 1 : undefined,
      reportUnitsPreviousPackage: templateRecurring ? true : undefined,
    });
    return buildOcsCommand("createPrepaidPackageTemplate", payload);
  }, [selectedResellerId, templateCost, templateDataGb, templateDestinationZoneId, templateLocationZoneId, templateName, templateRecurring, templateThrottling, templateValidityDays]);

  const locationZoneCommand = useMemo(() => {
    const payload = {
      networkProfileId: numberOrUndefined(networkProfileId),
      locationZoneName,
      tadigList: tadigs
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    };
    return buildOcsCommand("createLocationZone", cleanObject(payload));
  }, [locationZoneName, networkProfileId, tadigs]);

  const catalogItems = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return ocsCommandCatalog.filter((item) => {
      const groupMatch = catalogGroup === "All" || item.group === catalogGroup;
      const queryMatch = !query || `${item.group} ${item.command} ${item.description}`.toLowerCase().includes(query);
      return groupMatch && queryMatch;
    });
  }, [catalogGroup, catalogQuery]);

  const networkProfiles = readArray(overview?.networkProfiles, "listNetworkProfile");
  const resellers = readResellers(overview?.resellerAccounts);
  const selectedResellerAccounts = useMemo(() => {
    const reseller = resellers.find((item) => String(item.id) === selectedResellerId);
    return Array.isArray(reseller?.account) ? reseller.account : [];
  }, [resellers, selectedResellerId]);
  const locationZones = readArray(overview?.locationZones, "listDetailedLocationZone");
  const destinationLists = readArray(overview?.destinationLists, "listDetailedDestinationList");
  const packageTemplates = readArray(overview?.packageTemplates, "listPrepaidPackageTemplate");
  const filteredLocationZones = useMemo(() => {
    const query = locationZoneSearch.trim().toLowerCase();
    return locationZones
      .filter((zone) => {
        const label = `${zone.zoneId ?? ""} ${zone.zoneName ?? ""}`.toLowerCase();
        return !query || label.includes(query);
      })
      .slice(0, 80);
  }, [locationZoneSearch, locationZones]);

  async function loadOverview(notify = true) {
    setLoadingOverview(true);
    try {
      const response = await fetch("/api/admin/ocs/creation?resource=overview", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to load OCS inventory.");
      setOverview(json.data);
      const loadedResellers = readResellers(json.data.resellerAccounts);
      if (loadedResellers.length > 0 && !loadedResellers.some((item) => String(item.id) === selectedResellerId)) {
        setSelectedResellerId(String(loadedResellers[0].id));
        const firstAccount = loadedResellers[0].account?.[0];
        if (firstAccount?.id) setSelectedAccountId(String(firstAccount.id));
      } else {
        const activeReseller = loadedResellers.find((item) => String(item.id) === selectedResellerId);
        const firstAccount = activeReseller?.account?.[0];
        if (!selectedAccountId && firstAccount?.id) setSelectedAccountId(String(firstAccount.id));
      }
      if (notify) showToast("OCS inventory loaded.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load OCS inventory.";
      showToast(message, "error");
    } finally {
      setLoadingOverview(false);
    }
  }

  async function changeSelectedReseller(id: string) {
    setSelectedResellerId(id);
    setLoadingOverview(true);
    try {
      const response = await fetch(`/api/admin/ocs/creation?resource=overview&resellerId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to load reseller inventory.");
      setOverview(json.data);
      const loadedResellers = readResellers(json.data.resellerAccounts);
      const activeReseller = loadedResellers.find((item) => String(item.id) === id);
      const firstAccount = activeReseller?.account?.[0];
      setSelectedAccountId(firstAccount?.id ? String(firstAccount.id) : "");
      showToast(`Loaded reseller ${id}.`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load reseller inventory.";
      showToast(message, "error");
    } finally {
      setLoadingOverview(false);
    }
  }

  async function createLocationZone() {
    if (!networkProfileId.trim()) {
      showToast("Network profile ID is required.", "warning");
      return;
    }
    if (locationConfirmation !== "CREATE LOCATION ZONE") {
      showToast("Type CREATE LOCATION ZONE to confirm.", "warning");
      return;
    }
    const payload = commandPayload<{ networkProfileId: number; locationZoneName: string; tadigList: string[] }>(locationZoneCommand, "createLocationZone");
    await submitMutation({
      action: "createLocationZone",
      payload,
      reason: locationReason,
      confirmation: locationConfirmation,
    });
  }

  async function createPackageTemplate() {
    if (!templateLocationZoneId.trim()) {
      showToast("Select a live OCS location zone before creating the package template.", "warning");
      return;
    }
    if (!templateName.trim()) {
      showToast("Template name is required.", "warning");
      return;
    }
    const normalizedTemplateName = normalizePackageTemplateName(templateName);
    const duplicateTemplate = packageTemplates.find((template) => {
      const existingName = String(template.prepaidpackagetemplatename ?? template.userUiName ?? "");
      return normalizePackageTemplateName(existingName) === normalizedTemplateName;
    });
    if (duplicateTemplate) {
      showToast(`A package template named "${templateName}" already exists in OCS. Use a unique name.`, "warning");
      return;
    }
    const payload = commandPayload<Record<string, unknown>>(packageTemplateCommand, "createPrepaidPackageTemplate");
    await submitMutation({
      action: "createPrepaidPackageTemplate",
      payload,
      reason: templateReason,
    });
  }

  async function submitMutation(body: Record<string, unknown>) {
    setSubmittingAction(String(body.action ?? "ocs"));
    try {
      const response = await fetch("/api/admin/ocs/creation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "OCS creation failed.");
      showToast("OCS creation completed successfully.", "success");
      await loadOverview(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCS creation failed.";
      showToast(message, "error");
    } finally {
      setSubmittingAction("");
    }
  }

  function lockLiveExecution() {
    setLiveStatus("Live OCS mutations are available only through this server-side route with same-origin checks, request validation, and reason capture. Location-zone creation still requires typed confirmation.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">OCS Creation Panel</h1>
          <p className="mt-1 text-sm text-slate-500">Create package requests, location zones, activation QR codes, and inspect documented OCS API coverage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => loadOverview(true)} disabled={loadingOverview}>
            <RefreshCw className={cn("h-4 w-4", loadingOverview && "animate-spin")} />
            Pull OCS data
          </Button>
          <a
            href="https://github.com/yajvazi/ocs-api"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileJson2 className="h-4 w-4 text-primary" />
            OCS Docs
          </a>
          <Button type="button" onClick={lockLiveExecution}>
            <ShieldAlert className="h-4 w-4" />
            Safety status
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This panel pulls live OCS inventory and can submit documented creation commands. Package templates create directly in OCS after validation; location zones still require exact typed confirmation.
          </p>
        </div>
        {liveStatus ? <p className="mt-2 pl-7 text-xs font-semibold text-amber-950">{liveStatus}</p> : null}
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Network profiles", networkProfiles.length],
          ["Resellers", resellers.length],
          ["Location zones", locationZones.length],
          ["Destination lists", destinationLists.length],
          ["Package templates", packageTemplates.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{overview ? `${overview.mode.toUpperCase()} OCS` : "Not loaded"}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <ResellerBalanceList resellers={resellers} selectedResellerId={selectedResellerId} onSelect={changeSelectedReseller} />
        <InventoryList title="Network Profiles" rows={networkProfiles} idKey="id" nameKey="name" empty="No network profiles loaded yet." />
        <InventoryList title="Location Zones" rows={locationZones} idKey="zoneId" nameKey="zoneName" empty="No location zones loaded yet." />
        <InventoryList title="Destination Lists" rows={destinationLists} idKey="listId" nameKey="listName" empty="No destination lists loaded yet." />
        <InventoryList title="Package Templates" rows={packageTemplates} idKey="prepaidpackagetemplateid" nameKey="prepaidpackagetemplatename" empty="No package templates loaded yet." />
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-primary",
                activeTab === tab.key && "bg-primary text-white shadow-sm hover:bg-primary hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "assign" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <PanelCard title="Assign Prepaid Package" description="Generate affectPackageToSubscriber using documented subscriber identifiers." className="xl:col-span-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Package template ID" value={packageTemplateId} onChange={setPackageTemplateId} placeholder="553" />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Subscriber identifier</span>
                <select value={identifierType} onChange={(event) => setIdentifierType(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                  {["subscriberId", "imsi", "iccid", "msisdn", "multiImsi", "activationCode", "accountForSubs"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              {identifierType === "accountForSubs" ? (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Account ID</span>
                  <select
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Select account</option>
                    {selectedResellerAccounts.map((account) => (
                      <option key={String(account.id)} value={String(account.id)}>
                        {account.name ?? "Account"} #{String(account.id)} - {formatBalance(account.balance)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <Field label="Identifier value" value={identifier} onChange={setIdentifier} placeholder="1000" />
              )}
              <Field label="Validity period days" value={validityPeriod} onChange={setValidityPeriod} placeholder="Optional override" />
              <Field label="Active start" value={activeStart} onChange={setActiveStart} type="datetime-local" />
              <Field label="Active end" value={activeEnd} onChange={setActiveEnd} type="datetime-local" />
            </div>
          </PanelCard>
          <div className="xl:col-span-7"><CommandPreview command={packageAssignmentCommand} onQrText={setQrInput} /></div>
        </div>
      ) : null}

      {activeTab === "template" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <PanelCard title="Create Package Template" description="Generate createPrepaidPackageTemplate with retail fields kept separate from upstream cost later in InternetKudo." className="xl:col-span-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Template name" value={templateName} onChange={setTemplateName} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Reseller</span>
                <select
                  value={selectedResellerId}
                  onChange={(event) => void changeSelectedReseller(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  {resellers.length === 0 ? (
                    <option value={selectedResellerId}>Reseller #{selectedResellerId}</option>
                  ) : (
                    resellers.map((reseller) => (
                      <option key={String(reseller.id)} value={String(reseller.id)}>
                        {reseller.name ?? "Reseller"} #{String(reseller.id)} - {formatBalance(reseller.resellerBalance ?? reseller.resellerInfo?.balance ?? reseller.balance)}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-xs text-slate-500">OCS creates package templates under the reseller ID. Account ID is used when assigning packages with accountForSubs.</p>
              </label>
              <div className="md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Location zone</span>
                <div className="mt-1 grid gap-2 sm:grid-cols-[1fr_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      value={locationZoneSearch}
                      onChange={(event) => setLocationZoneSearch(event.target.value)}
                      placeholder="Search live location zones..."
                      className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <select
                    value={templateLocationZoneId}
                    onChange={(event) => setTemplateLocationZoneId(event.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Select zone</option>
                    {filteredLocationZones.map((zone) => (
                      <option key={String(zone.zoneId)} value={String(zone.zoneId)}>
                        {String(zone.zoneName ?? "Unnamed")} #{String(zone.zoneId)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {locationZones.length > 0 ? `${locationZones.length} live OCS zones loaded.` : "Pull OCS data to populate live zones."}
                </p>
              </div>
              <Field label="Destination zone ID" value={templateDestinationZoneId} onChange={setTemplateDestinationZoneId} placeholder="Optional" />
              <Field label="Data allowance GB" value={templateDataGb} onChange={setTemplateDataGb} />
              <Field label="Validity days" value={templateValidityDays} onChange={setTemplateValidityDays} />
              <Field label="Upstream cost" value={templateCost} onChange={setTemplateCost} placeholder="Optional" />
              <div className="flex items-end gap-4 pb-1">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={templateThrottling} onChange={(event) => setTemplateThrottling(event.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
                  Throttling active
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={templateRecurring} onChange={(event) => setTemplateRecurring(event.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
                  Recurring
                </label>
              </div>
              <Field label="Reason" value={templateReason} onChange={setTemplateReason} />
              <Button type="button" onClick={createPackageTemplate} disabled={submittingAction === "createPrepaidPackageTemplate"}>
                <PackagePlus className="h-4 w-4" />
                {submittingAction === "createPrepaidPackageTemplate" ? "Creating..." : "Create in OCS"}
              </Button>
            </div>
          </PanelCard>
          <div className="xl:col-span-7"><CommandPreview command={packageTemplateCommand} onQrText={setQrInput} /></div>
        </div>
      ) : null}

      {activeTab === "location" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <PanelCard title="Create Location Zone" description="Generate createLocationZone with network profile and TADIG operator list." className="xl:col-span-5">
            <div className="grid gap-4">
              <Field label="Network profile ID" value={networkProfileId} onChange={setNetworkProfileId} placeholder="Required" />
              <Field label="Location zone name" value={locationZoneName} onChange={setLocationZoneName} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">TADIG list</span>
                <textarea value={tadigs} onChange={(event) => setTadigs(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </label>
              <Field label="Reason" value={locationReason} onChange={setLocationReason} />
              <Field label="Type CREATE LOCATION ZONE" value={locationConfirmation} onChange={setLocationConfirmation} />
              <Button type="button" onClick={createLocationZone} disabled={submittingAction === "createLocationZone"}>
                <Send className="h-4 w-4" />
                {submittingAction === "createLocationZone" ? "Creating..." : "Create in OCS"}
              </Button>
            </div>
          </PanelCard>
          <div className="xl:col-span-7"><CommandPreview command={locationZoneCommand} onQrText={setQrInput} /></div>
        </div>
      ) : null}

      {activeTab === "qr" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <PanelCard title="Activation QR Generator" description="Generate QR codes locally in the browser without sending activation payloads to third-party QR services." className="xl:col-span-5">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Activation payload or installation URL</span>
              <textarea value={qrInput} onChange={(event) => setQrInput(event.target.value)} rows={8} className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(qrInput)}>
                <Clipboard className="h-4 w-4" />
                Copy payload
              </Button>
              {qrDataUrl ? (
                <a href={qrDataUrl} download="internetkudo-esim-qr.png" className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-2.5 text-sm font-medium text-white hover:bg-primary/80">
                  <Download className="h-4 w-4" />
                  Download PNG
                </a>
              ) : null}
            </div>
          </PanelCard>
          <section className="rounded-lg border border-border bg-white p-5 text-center shadow-sm xl:col-span-7">
            <div className="mx-auto flex h-[320px] max-w-[320px] items-center justify-center rounded-lg border border-border bg-slate-50 p-4">
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt="Generated eSIM activation QR code"
                  width={288}
                  height={288}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <QrCode className="h-16 w-16 text-slate-300" />
              )}
            </div>
            <p className="mt-4 text-sm text-slate-500">Sensitive activation data stays in this browser session.</p>
          </section>
        </div>
      ) : null}

      {activeTab === "catalog" ? (
        <section className="rounded-lg border border-border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Documented OCS API Coverage</h2>
              <p className="mt-1 text-sm text-slate-500">Command names are taken from the public Telco-vision OCS API documentation fork.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search commands..." className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-64" />
              </div>
              <select value={catalogGroup} onChange={(event) => setCatalogGroup(event.target.value)} className="h-9 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                <option>All</option>
                {ocsCommandGroups.map((group) => <option key={group}>{group}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {catalogItems.map((item) => (
              <article key={`${item.group}-${item.command}`} className="rounded-lg border border-border bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.group}</div>
                    <h3 className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{item.command}</h3>
                  </div>
                  <span className={cn("rounded-full border px-2 py-1 text-[11px] font-bold uppercase", safetyClass(item.safety))}>{item.safety}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.description}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-border">
                  <Boxes className="h-3.5 w-3.5 text-primary" />
                  {item.version}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
