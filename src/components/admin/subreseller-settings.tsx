"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, KeyRound, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminApiGroupOptions, adminPageOptions, type AdminApiGroup, type AdminPageKey } from "@/lib/admin/pages";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type SubresellerProfile = {
  id: string;
  name: string;
  active: boolean;
  ocsResellerId: number;
  ocsAccountId: number | null;
  stripeProfileId: string;
  stripeAccountId: string | null;
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
  updatedAt: string;
};

type FormState = {
  id?: string;
  name: string;
  active: boolean;
  ocsResellerId: string;
  ocsAccountId: string;
  stripeProfileId: string;
  stripeAccountId: string;
  adminEmail: string;
  allowedDashboardPages: AdminPageKey[];
  allowedApiGroups: AdminApiGroup[];
  rateLimitPerMinute: string;
  canViewCosts: boolean;
  canIssueRefunds: boolean;
  canRevealEsimSecrets: boolean;
  notes: string;
};

type TopupSettings = {
  minimumAmountMinor: number;
  currency: "EUR";
  stripeMode: "live" | "test";
};

type SubresellerTopup = {
  id: string;
  resellerId: string;
  resellerName: string;
  ocsResellerId: number;
  amountMinor: number;
  stripeFeeMinor: number;
  netAmountMinor: number;
  currency: string;
  stripeMode: "live" | "test";
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  paymentStatus: string;
  ocsStatus: string;
  lastError: string | null;
  createdAt: string;
  paidAt: string | null;
  appliedAt: string | null;
};

type OcsResellerAccount = {
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

const defaultForm: FormState = {
  name: "",
  active: true,
  ocsResellerId: "",
  ocsAccountId: "",
  stripeProfileId: "internetkudo-platform",
  stripeAccountId: "",
  adminEmail: "",
  allowedDashboardPages: ["dashboard", "orders", "packages", "esims"],
  allowedApiGroups: ["Countries", "Plans", "Checkout", "Orders", "eSIMs", "Top-ups"],
  rateLimitPerMinute: "120",
  canViewCosts: false,
  canIssueRefunds: false,
  canRevealEsimSecrets: false,
  notes: "",
};

const defaultTopupSettings: TopupSettings = {
  minimumAmountMinor: 50_000,
  currency: "EUR",
  stripeMode: "test",
};

export function SubresellerSettings() {
  const [profiles, setProfiles] = useState<SubresellerProfile[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [topupSettings, setTopupSettings] = useState<TopupSettings>(defaultTopupSettings);
  const [ocsResellers, setOcsResellers] = useState<OcsResellerAccount[]>([]);
  const [ocsSyncError, setOcsSyncError] = useState<string | null>(null);
  const [minimumTopupEur, setMinimumTopupEur] = useState("500");
  const [topups, setTopups] = useState<SubresellerTopup[]>([]);
  const [topupForm, setTopupForm] = useState({ resellerId: "", amountEur: "500" });
  const [latestClientSecret, setLatestClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTopupSettings, setSavingTopupSettings] = useState(false);
  const [creatingTopup, setCreatingTopup] = useState(false);
  const [applyingTopupId, setApplyingTopupId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void loadProfiles(false);
  }, []);

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return profiles;
    return profiles.filter((profile) => `${profile.name} ${profile.adminEmail ?? ""} ${profile.ocsResellerId} ${profile.ocsAccountId ?? ""}`.toLowerCase().includes(normalized));
  }, [profiles, query]);

  async function loadProfiles(notify = true) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/subresellers", { cache: "no-store" });
      const [json, settingsJson, topupsJson] = await Promise.all([
        response.json(),
        fetch("/api/admin/subresellers/topup-settings", { cache: "no-store" }).then((item) => item.json()),
        fetch("/api/admin/subresellers/topups", { cache: "no-store" }).then((item) => item.json()),
      ]);
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to load subreseller settings.");
      setProfiles(json.data.profiles);
      setOcsResellers(json.data.ocsResellerAccounts ?? []);
      setOcsSyncError(json.data.ocsSyncError ?? null);
      if (settingsJson.success) {
        setTopupSettings(settingsJson.data.settings);
        setMinimumTopupEur(minorToInput(settingsJson.data.settings.minimumAmountMinor));
        setTopupForm((current) => ({ ...current, amountEur: minorToInput(settingsJson.data.settings.minimumAmountMinor) }));
      }
      if (topupsJson.success) setTopups(topupsJson.data.topups);
      if (notify) showToast("Subreseller settings refreshed.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load subreseller settings.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        id: form.id,
        name: form.name.trim(),
        active: form.active,
        ocsResellerId: Number(form.ocsResellerId),
        ocsAccountId: form.ocsAccountId ? Number(form.ocsAccountId) : null,
        stripeProfileId: form.stripeProfileId.trim() || "internetkudo-platform",
        stripeAccountId: form.stripeAccountId.trim() || null,
        adminEmail: form.adminEmail.trim() || null,
        allowedDashboardPages: form.allowedDashboardPages,
        allowedApiGroups: form.allowedApiGroups,
        rateLimitPerMinute: Number(form.rateLimitPerMinute),
        canViewCosts: form.canViewCosts,
        canIssueRefunds: form.canIssueRefunds,
        canRevealEsimSecrets: form.canRevealEsimSecrets,
        notes: form.notes.trim() || null,
      };

      const response = await fetch("/api/admin/subresellers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to save subreseller settings.");

      setProfiles((current) => [json.data.profile, ...current.filter((profile) => profile.id !== json.data.profile.id)]);
      setForm(defaultForm);
      showToast("Subreseller access saved.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save subreseller settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  function editProfile(profile: SubresellerProfile) {
    setForm({
      id: profile.id,
      name: profile.name,
      active: profile.active,
      ocsResellerId: String(profile.ocsResellerId),
      ocsAccountId: profile.ocsAccountId ? String(profile.ocsAccountId) : "",
      stripeProfileId: profile.stripeProfileId,
      stripeAccountId: profile.stripeAccountId ?? "",
      adminEmail: profile.adminEmail ?? "",
      allowedDashboardPages: profile.allowedDashboardPages.length ? profile.allowedDashboardPages : defaultForm.allowedDashboardPages,
      allowedApiGroups: profile.allowedApiGroups.length ? profile.allowedApiGroups : defaultForm.allowedApiGroups,
      rateLimitPerMinute: String(profile.rateLimitPerMinute),
      canViewCosts: profile.canViewCosts,
      canIssueRefunds: profile.canIssueRefunds,
      canRevealEsimSecrets: profile.canRevealEsimSecrets,
      notes: profile.notes ?? "",
    });
    showToast(`Editing ${profile.name}.`, "info");
  }

  function fillFromOcs(resellerId: string) {
    const reseller = ocsResellers.find((item) => String(item.ocsResellerId) === resellerId);
    if (!reseller) return;
    setForm((current) => ({
      ...current,
      name: current.name || reseller.name,
      ocsResellerId: String(reseller.ocsResellerId),
      ocsAccountId: reseller.accounts[0] ? String(reseller.accounts[0].ocsAccountId) : current.ocsAccountId,
    }));
  }

  async function saveTopupSettings() {
    setSavingTopupSettings(true);
    try {
      const minimumAmountMinor = euroInputToMinor(minimumTopupEur);
      const response = await fetch("/api/admin/subresellers/topup-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          minimumAmountMinor,
          stripeMode: topupSettings.stripeMode,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to save top-up settings.");
      setTopupSettings(json.data.settings);
      setMinimumTopupEur(minorToInput(json.data.settings.minimumAmountMinor));
      setTopupForm((current) => ({ ...current, amountEur: minorToInput(json.data.settings.minimumAmountMinor) }));
      showToast("Top-up settings saved.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save top-up settings.", "error");
    } finally {
      setSavingTopupSettings(false);
    }
  }

  async function createTopup() {
    setCreatingTopup(true);
    setLatestClientSecret(null);
    try {
      const amountMinor = euroInputToMinor(topupForm.amountEur);
      const response = await fetch("/api/admin/subresellers/topups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resellerId: topupForm.resellerId,
          amountMinor,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to create top-up PaymentIntent.");
      setTopups((current) => [json.data.topup, ...current.filter((topup) => topup.id !== json.data.topup.id)]);
      setLatestClientSecret(json.data.clientSecret ?? null);
      showToast("Stripe PaymentIntent created. Confirm it from the payment UI, then the webhook will credit OCS.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create top-up PaymentIntent.", "error");
    } finally {
      setCreatingTopup(false);
    }
  }

  async function applyTopup(topupId: string) {
    setApplyingTopupId(topupId);
    try {
      const response = await fetch(`/api/admin/subresellers/topups/${topupId}/apply`, { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to apply top-up.");
      setTopups((current) => current.map((topup) => topup.id === topupId ? json.data.topup : topup));
      showToast("Paid top-up applied to OCS reseller balance.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to apply top-up.", "error");
    } finally {
      setApplyingTopupId(null);
    }
  }

  function togglePage(key: AdminPageKey) {
    setForm((current) => ({
      ...current,
      allowedDashboardPages: toggleValue(current.allowedDashboardPages, key),
    }));
  }

  function toggleApiGroup(group: AdminApiGroup) {
    setForm((current) => ({
      ...current,
      allowedApiGroups: toggleValue(current.allowedApiGroups, group),
    }));
  }

  return (
    <section className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-slate-950">Subreseller access and API profiles</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Configure dashboard limits, OCS routing, Stripe profile mapping, and API group access for future subresellers.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => loadProfiles(true)} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh profiles
        </Button>
      </div>

      <div className="grid gap-5 p-5 2xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-semibold text-slate-900">{profiles.length} configured profiles</div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reseller, admin, account..."
              className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4 md:w-72"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr_0.8fr] border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span>Subreseller</span>
              <span>OCS routing</span>
              <span>Admin scope</span>
              <span>Status</span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {loading && profiles.length === 0 ? (
                <div className="space-y-3 p-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No subreseller profiles match this search.</div>
              ) : (
                filteredProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => editProfile(profile)}
                    className="grid w-full grid-cols-[1.1fr_0.9fr_0.9fr_0.8fr] items-center gap-3 border-b border-border px-3 py-3 text-left text-sm transition-colors last:border-0 hover:bg-blue-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{profile.name}</div>
                      <div className="truncate text-xs text-slate-500">{profile.adminEmail ?? "No admin email assigned"}</div>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div>Reseller {profile.ocsResellerId}</div>
                      <div>Account {profile.ocsAccountId ?? "default"}</div>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div>{profile.allowedDashboardPages.length} pages</div>
                      <div>{profile.allowedApiGroups.length} API groups</div>
                      <div>{profile.topupCount} paid top-ups</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge tone={profile.active ? "success" : "neutral"}>{profile.active ? "Active" : "Disabled"}</StatusBadge>
                      {profile.canIssueRefunds ? <StatusBadge tone="warning">Refunds</StatusBadge> : null}
                      <StatusBadge tone="info">Net {formatMinor(profile.topupNetCreditedMinor, "EUR")}</StatusBadge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="border-b border-border bg-slate-50 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">OCS listResellerAccount</div>
              <div className="text-xs text-slate-500">Live reseller and account inventory synced into profiles on refresh.</div>
            </div>
            {ocsSyncError ? <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{ocsSyncError}</div> : null}
            <div className="max-h-72 overflow-auto">
              {loading && ocsResellers.length === 0 ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
                </div>
              ) : ocsResellers.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No OCS resellers returned from listResellerAccount.</div>
              ) : (
                ocsResellers.map((reseller) => (
                  <div key={reseller.ocsResellerId} className="border-b border-border px-3 py-3 text-sm last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-950">{reseller.name}</div>
                        <div className="text-xs text-slate-500">OCS reseller {reseller.ocsResellerId} · {reseller.accounts.length} accounts</div>
                      </div>
                      <div className="text-right text-xs font-semibold text-slate-700">{formatBalance(reseller.balance)}</div>
                    </div>
                    <div className="mt-2 grid gap-1">
                      {reseller.accounts.map((account) => (
                        <div key={account.ocsAccountId} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                          <span>#{account.ocsAccountId} {account.name ?? "Account"}{account.packageOnly ? " · package only" : ""}</span>
                          <span className="font-semibold">{formatBalance(account.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <form className="rounded-lg border border-blue-100 bg-blue-50 p-4" onSubmit={saveProfile}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <KeyRound className="h-4 w-4 text-primary" />
              {form.id ? "Edit subreseller profile" : "Create subreseller profile"}
            </div>
            {form.id ? (
              <Button type="button" size="xs" variant="outline" onClick={() => setForm(defaultForm)}>
                New
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Fill from OCS reseller</span>
              <select
                value=""
                onChange={(event) => fillFromOcs(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
              >
                <option value="">Select OCS reseller...</option>
                {ocsResellers.map((reseller) => (
                  <option key={reseller.ocsResellerId} value={reseller.ocsResellerId}>
                    {reseller.name} - reseller {reseller.ocsResellerId} - {formatBalance(reseller.balance)}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label="Subreseller name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <TextInput label="Admin email" type="email" value={form.adminEmail} onChange={(value) => setForm((current) => ({ ...current, adminEmail: value }))} />
            <TextInput label="OCS reseller ID" inputMode="numeric" value={form.ocsResellerId} onChange={(value) => setForm((current) => ({ ...current, ocsResellerId: value }))} />
            <TextInput label="OCS account ID" inputMode="numeric" value={form.ocsAccountId} onChange={(value) => setForm((current) => ({ ...current, ocsAccountId: value }))} />
            <TextInput label="Stripe profile ID" value={form.stripeProfileId} onChange={(value) => setForm((current) => ({ ...current, stripeProfileId: value }))} />
            <TextInput label="Stripe connected account" value={form.stripeAccountId} onChange={(value) => setForm((current) => ({ ...current, stripeAccountId: value }))} />
            <TextInput label="Rate limit per minute" inputMode="numeric" value={form.rateLimitPerMinute} onChange={(value) => setForm((current) => ({ ...current, rateLimitPerMinute: value }))} />
            <label className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Active profile
            </label>
          </div>

          <fieldset className="mt-4 rounded-lg border border-border bg-white p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">Dashboard pages</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {adminPageOptions.map((page) => (
                <CheckboxPill key={page.key} checked={form.allowedDashboardPages.includes(page.key)} label={page.label} onClick={() => togglePage(page.key)} />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4 rounded-lg border border-border bg-white p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">API groups</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {adminApiGroupOptions.map((group) => (
                <CheckboxPill key={group} checked={form.allowedApiGroups.includes(group)} label={group} onClick={() => toggleApiGroup(group)} />
              ))}
            </div>
          </fieldset>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Flag checked={form.canViewCosts} label="View costs" onChange={(checked) => setForm((current) => ({ ...current, canViewCosts: checked }))} />
            <Flag checked={form.canIssueRefunds} label="Issue refunds" onChange={(checked) => setForm((current) => ({ ...current, canIssueRefunds: checked }))} />
            <Flag checked={form.canRevealEsimSecrets} label="Reveal eSIM secrets" onChange={(checked) => setForm((current) => ({ ...current, canRevealEsimSecrets: checked }))} />
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Internal notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="mt-1 min-h-20 w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            />
          </label>

          <p className="mt-3 rounded-md bg-white p-3 text-xs leading-5 text-slate-600">
            Stripe secret keys stay server-side. This profile stores routing identifiers only; live secret values should be mapped by profile ID in the encrypted runtime environment.
          </p>

          <Button type="submit" className="mt-4 w-full" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save subreseller profile"}
          </Button>
        </form>
      </div>

      <div className="border-t border-border p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-slate-950">Stripe subreseller balance top-ups</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">Create a Stripe PaymentIntent first. After Stripe confirms payment, the webhook credits the OCS reseller with the net amount after Stripe fees.</p>
          </div>
          <StatusBadge tone={topupSettings.stripeMode === "live" ? "success" : "warning"}>
            Stripe {topupSettings.stripeMode.toUpperCase()}
          </StatusBadge>
        </div>

        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-950">Top-up settings</div>
              <div className="mt-3 grid gap-3">
                <TextInput label="Minimum top-up EUR" inputMode="decimal" value={minimumTopupEur} onChange={setMinimumTopupEur} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Stripe mode</div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["test", "live"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTopupSettings((current) => ({ ...current, stripeMode: mode }))}
                        className={cn(
                          "h-10 rounded-md border text-sm font-bold uppercase transition-colors",
                          topupSettings.stripeMode === mode ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-600 hover:bg-slate-100",
                        )}
                      >
                        {mode === "test" ? "Test mode" : "Live mode"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Test mode uses `STRIPE_TEST_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY`. For demos, successful test payments still credit the selected OCS reseller balance.
                  </p>
                </div>
                <Button type="button" onClick={saveTopupSettings} disabled={savingTopupSettings}>
                  <Save className="h-4 w-4" />
                  {savingTopupSettings ? "Saving..." : "Save top-up settings"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-bold text-slate-950">Create top-up PaymentIntent</div>
              <div className="mt-3 grid gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Subreseller</span>
                  <select
                    value={topupForm.resellerId}
                    onChange={(event) => setTopupForm((current) => ({ ...current, resellerId: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
                  >
                    <option value="">Select subreseller</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name} - OCS {profile.ocsResellerId} - net credited {formatMinor(profile.topupNetCreditedMinor, "EUR")}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput label="Top-up amount EUR" inputMode="decimal" value={topupForm.amountEur} onChange={(value) => setTopupForm((current) => ({ ...current, amountEur: value }))} />
                <Button type="button" onClick={createTopup} disabled={creatingTopup || !topupForm.resellerId}>
                  <CreditCard className="h-4 w-4" />
                  {creatingTopup ? "Creating..." : "Create Stripe PaymentIntent"}
                </Button>
                {latestClientSecret ? (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(latestClientSecret);
                      showToast("Client secret copied.", "success");
                    }}
                    className="rounded-md border border-border bg-white p-3 text-left text-xs font-mono text-slate-600 hover:bg-slate-50"
                  >
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Latest client secret</span>
                    <span className="mt-1 block truncate">{latestClientSecret}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.15fr_0.7fr_0.7fr_0.7fr_0.7fr_0.75fr_0.6fr] border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span>Subreseller</span>
              <span>Gross</span>
              <span>Stripe fee</span>
              <span>OCS credit</span>
              <span>Mode</span>
              <span>OCS</span>
              <span>Action</span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {loading && topups.length === 0 ? (
                <div className="space-y-3 p-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : topups.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No subreseller top-ups have been created yet.</div>
              ) : (
                topups.map((topup) => (
                  <div key={topup.id} className="grid grid-cols-[1.15fr_0.7fr_0.7fr_0.7fr_0.7fr_0.75fr_0.6fr] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{topup.resellerName}</div>
                      <div className="truncate text-xs text-slate-500">{topup.stripeChargeId ?? topup.stripePaymentIntentId ?? topup.id}</div>
                    </div>
                    <div className="font-semibold text-slate-900">{formatMinor(topup.amountMinor, topup.currency)}</div>
                    <div className="font-semibold text-red-700">{formatMinor(topup.stripeFeeMinor, topup.currency)}</div>
                    <div className="font-semibold text-green-700">{formatMinor(topup.netAmountMinor, topup.currency)}</div>
                    <StatusBadge tone={topup.stripeMode === "live" ? "success" : "warning"}>{topup.stripeMode}</StatusBadge>
                    <div className="min-w-0">
                      <StatusBadge tone={topup.paymentStatus === "succeeded" ? "success" : topup.paymentStatus === "failed" ? "error" : "info"}>{topup.paymentStatus}</StatusBadge>
                      <StatusBadge tone={topup.ocsStatus === "applied" ? "success" : topup.ocsStatus === "failed" ? "error" : "neutral"}>{topup.ocsStatus}</StatusBadge>
                      {topup.lastError ? <div className="mt-1 truncate text-xs text-red-600">{topup.lastError}</div> : null}
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => applyTopup(topup.id)}
                      disabled={applyingTopupId === topup.id || topup.paymentStatus !== "succeeded" || topup.ocsStatus === "applied"}
                    >
                      {applyingTopupId === topup.id ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
      />
    </label>
  );
}

function CheckboxPill({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 items-center justify-between rounded-md border px-3 text-left text-xs font-semibold transition-colors",
        checked ? "border-primary bg-blue-50 text-primary" : "border-border bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn("ml-2 h-2.5 w-2.5 rounded-full", checked ? "bg-lime-400" : "bg-slate-200")} />
    </button>
  );
}

function Flag({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function toggleValue<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function euroInputToMinor(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Enter a valid EUR amount.");
  return Math.round(parsed * 100);
}

function minorToInput(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, "");
}

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

function formatBalance(value: string | number | null) {
  if (value === null || value === undefined || value === "") return "Balance unavailable";
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parsed);
}
