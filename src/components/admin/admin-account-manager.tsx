"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/status-badge";
import { adminApiGroupOptions, adminPageOptions, type AdminApiGroup, type AdminPageKey } from "@/lib/admin/pages";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type AdminRole = "super_admin" | "subreseller" | "vendor" | "operations" | "finance" | "support" | "analyst" | "developer" | "read_only";
type UserType = "super_admin" | "subreseller" | "vendor";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  lastLoginAt?: string;
  disabledAt?: string;
};

type SubresellerProfile = {
  id: string;
  name: string;
  active: boolean;
  ocsResellerId: number;
  ocsAccountId: number | null;
  adminEmail: string | null;
  allowedDashboardPages: AdminPageKey[];
  allowedApiGroups: AdminApiGroup[];
  updatedAt: string;
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

type FormState = {
  userType: UserType;
  name: string;
  email: string;
  password: string;
  profileName: string;
  ocsResellerId: string;
  ocsAccountId: string;
  stripeProfileId: string;
  stripeAccountId: string;
  allowedDashboardPages: AdminPageKey[];
  allowedApiGroups: AdminApiGroup[];
  rateLimitPerMinute: string;
  canViewCosts: boolean;
  canIssueRefunds: boolean;
  canRevealEsimSecrets: boolean;
  notes: string;
};

const defaultSubresellerPages: AdminPageKey[] = ["dashboard", "orders", "packages", "creation", "esims", "payments", "api-docs"];
const defaultVendorPages: AdminPageKey[] = ["dashboard", "orders", "packages", "customers", "esims"];
const defaultSubresellerApiGroups: AdminApiGroup[] = ["Countries", "Plans", "Checkout", "Orders", "eSIMs", "Top-ups", "OCS Gateway", "Stripe"];
const defaultVendorApiGroups: AdminApiGroup[] = ["Countries", "Plans", "Orders", "eSIMs", "Support"];

const defaultForm: FormState = {
  userType: "subreseller",
  name: "",
  email: "",
  password: "",
  profileName: "",
  ocsResellerId: "",
  ocsAccountId: "",
  stripeProfileId: "internetkudo-platform",
  stripeAccountId: "",
  allowedDashboardPages: defaultSubresellerPages,
  allowedApiGroups: defaultSubresellerApiGroups,
  rateLimitPerMinute: "120",
  canViewCosts: false,
  canIssueRefunds: false,
  canRevealEsimSecrets: false,
  notes: "",
};

const userTypes: Array<{ value: UserType; label: string; description: string }> = [
  { value: "super_admin", label: "Superadmin", description: "Full platform access. No reseller routing limits." },
  { value: "subreseller", label: "Subreseller", description: "Scoped dashboard and API access linked to an OCS reseller/account." },
  { value: "vendor", label: "Vendor", description: "Limited operating access linked to an OCS reseller/account." },
];

function roleLabel(role: string) {
  if (role === "super_admin") return "Superadmin";
  return role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminAccountManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [profiles, setProfiles] = useState<SubresellerProfile[]>([]);
  const [ocsResellers, setOcsResellers] = useState<OcsResellerAccount[]>([]);
  const [ocsSyncError, setOcsSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [resellerSearch, setResellerSearch] = useState("");

  useEffect(() => {
    void loadData(false);
  }, []);

  const selectedReseller = useMemo(
    () => ocsResellers.find((item) => String(item.ocsResellerId) === form.ocsResellerId) ?? null,
    [form.ocsResellerId, ocsResellers],
  );

  const filteredOcsResellers = useMemo(() => {
    const normalized = resellerSearch.trim().toLowerCase();
    if (!normalized) return ocsResellers;
    return ocsResellers.filter((reseller) => `${reseller.name} ${reseller.ocsResellerId} ${reseller.accounts.map((account) => account.ocsAccountId).join(" ")}`.toLowerCase().includes(normalized));
  }, [ocsResellers, resellerSearch]);

  async function loadData(notify = true) {
    setLoading(true);
    try {
      const [usersResponse, subresellersResponse] = await Promise.all([
        fetch("/api/admin/auth/users", { cache: "no-store" }),
        fetch("/api/admin/subresellers", { cache: "no-store" }),
      ]);
      const [usersJson, subresellersJson] = await Promise.all([usersResponse.json(), subresellersResponse.json()]);
      if (!usersResponse.ok || !usersJson.success) throw new Error(usersJson.error?.message ?? "Unable to load users.");
      setUsers(usersJson.data.users);

      if (subresellersJson.success) {
        setProfiles(subresellersJson.data.profiles ?? []);
        setOcsResellers(subresellersJson.data.ocsResellerAccounts ?? []);
        setOcsSyncError(subresellersJson.data.ocsSyncError ?? null);
      } else {
        setOcsSyncError(subresellersJson.error?.message ?? "Unable to load OCS reseller accounts.");
      }

      if (notify) showToast("User access refreshed.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load user access.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const scoped = form.userType !== "super_admin";
      const payload = {
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.userType,
        password: form.password,
        profile: scoped
          ? {
              name: (form.profileName || form.name).trim(),
              active: true,
              ocsResellerId: Number(form.ocsResellerId),
              ocsAccountId: form.ocsAccountId ? Number(form.ocsAccountId) : null,
              stripeProfileId: form.stripeProfileId.trim() || "internetkudo-platform",
              stripeAccountId: form.stripeAccountId.trim() || null,
              allowedDashboardPages: form.allowedDashboardPages,
              allowedApiGroups: form.allowedApiGroups,
              rateLimitPerMinute: Number(form.rateLimitPerMinute),
              canViewCosts: form.canViewCosts,
              canIssueRefunds: form.canIssueRefunds,
              canRevealEsimSecrets: form.canRevealEsimSecrets,
              notes: form.notes.trim() || `${roleLabel(form.userType)} account`,
            }
          : undefined,
      };

      const response = await fetch("/api/admin/auth/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to create user.");

      setUsers((current) => [json.data.user, ...current]);
      if (json.data.profile) setProfiles((current) => [json.data.profile, ...current.filter((profile) => profile.id !== json.data.profile.id)]);
      setForm(defaultForm);
      setResellerSearch("");
      showToast(`${roleLabel(form.userType)} account created.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create user.", "error");
    } finally {
      setCreating(false);
    }
  }

  function setUserType(userType: UserType) {
    setForm((current) => ({
      ...current,
      userType,
      allowedDashboardPages: userType === "vendor" ? defaultVendorPages : userType === "subreseller" ? defaultSubresellerPages : current.allowedDashboardPages,
      allowedApiGroups: userType === "vendor" ? defaultVendorApiGroups : userType === "subreseller" ? defaultSubresellerApiGroups : current.allowedApiGroups,
      canViewCosts: userType === "super_admin" ? false : current.canViewCosts,
      canIssueRefunds: userType === "super_admin" ? false : current.canIssueRefunds,
      canRevealEsimSecrets: userType === "super_admin" ? false : current.canRevealEsimSecrets,
    }));
  }

  function selectReseller(resellerId: string) {
    const reseller = ocsResellers.find((item) => String(item.ocsResellerId) === resellerId);
    setForm((current) => ({
      ...current,
      profileName: current.profileName || reseller?.name || "",
      ocsResellerId: resellerId,
      ocsAccountId: reseller?.accounts[0] ? String(reseller.accounts[0].ocsAccountId) : "",
    }));
  }

  function togglePage(key: AdminPageKey) {
    setForm((current) => ({ ...current, allowedDashboardPages: toggleValue(current.allowedDashboardPages, key) }));
  }

  function toggleApiGroup(group: AdminApiGroup) {
    setForm((current) => ({ ...current, allowedApiGroups: toggleValue(current.allowedApiGroups, group) }));
  }

  const scopedUser = form.userType !== "super_admin";

  return (
    <section className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-slate-950">User access and reseller routing</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Create one account type, then link OCS reseller/account routing and scoped dashboard/API permissions when needed.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh users
        </Button>
      </div>

      <div className="grid gap-5 p-5 2xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.1fr_0.75fr_0.65fr_0.8fr] border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <span>User</span>
              <span>Type</span>
              <span>Status</span>
              <span>Last login</span>
            </div>
            <div className="max-h-72 overflow-auto">
              {loading && users.length === 0 ? (
                <div className="space-y-3 p-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No users found.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="grid grid-cols-[1.1fr_0.75fr_0.65fr_0.8fr] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-950">{user.name}</div>
                      <div className="truncate text-xs text-slate-500">{user.email}</div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{roleLabel(user.role)}</span>
                    <StatusBadge tone={user.disabledAt ? "error" : "success"}>{user.disabledAt ? "Disabled" : "Active"}</StatusBadge>
                    <span className="text-xs text-slate-500">{formatDate(user.lastLoginAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-slate-50 px-3 py-2">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Linked reseller access</div>
                <div className="text-xs text-slate-500">{profiles.length} scoped subreseller/vendor profiles</div>
              </div>
              <div className="max-h-72 overflow-auto">
                {loading && profiles.length === 0 ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No scoped reseller profiles yet.</div>
                ) : (
                  profiles.map((profile) => (
                    <div key={profile.id} className="border-b border-border px-3 py-3 text-sm last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950">{profile.name}</div>
                          <div className="truncate text-xs text-slate-500">{profile.adminEmail ?? "No user linked"}</div>
                        </div>
                        <StatusBadge tone={profile.active ? "success" : "neutral"}>{profile.active ? "Active" : "Disabled"}</StatusBadge>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        OCS reseller {profile.ocsResellerId} · account {profile.ocsAccountId ?? "default"} · {profile.allowedDashboardPages.length} pages · {profile.allowedApiGroups.length} API groups
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-slate-50 px-3 py-2">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">OCS listResellerAccount</div>
                <div className="text-xs text-slate-500">Use these live reseller and account IDs when creating scoped users.</div>
              </div>
              {ocsSyncError ? <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{ocsSyncError}</div> : null}
              <div className="max-h-72 overflow-auto">
                {loading && ocsResellers.length === 0 ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
                  </div>
                ) : ocsResellers.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No OCS resellers returned.</div>
                ) : (
                  ocsResellers.map((reseller) => (
                    <div key={reseller.ocsResellerId} className="border-b border-border px-3 py-3 text-sm last:border-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950">{reseller.name}</div>
                          <div className="text-xs text-slate-500">Reseller {reseller.ocsResellerId} · {reseller.accounts.length} accounts</div>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">{formatBalance(reseller.balance)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <form className="rounded-lg border border-blue-100 bg-blue-50 p-4" onSubmit={createUser}>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
            <KeyRound className="h-4 w-4 text-primary" />
            Create user
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {userTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setUserType(type.value)}
                className={cn(
                  "rounded-md border px-3 py-3 text-left transition-colors",
                  form.userType === type.value ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                <span className="block text-sm font-bold">{type.label}</span>
                <span className={cn("mt-1 block text-xs leading-4", form.userType === type.value ? "text-blue-50" : "text-slate-500")}>{type.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TextInput label="Full name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <TextInput label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <TextInput label="Temporary password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
            {scopedUser ? (
              <TextInput label="Profile name" value={form.profileName} onChange={(value) => setForm((current) => ({ ...current, profileName: value }))} />
            ) : null}
          </div>

          {scopedUser ? (
            <>
              <fieldset className="mt-4 rounded-lg border border-border bg-white p-3">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">OCS routing</legend>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Search OCS resellers</span>
                    <input
                      value={resellerSearch}
                      onChange={(event) => setResellerSearch(event.target.value)}
                      placeholder="Search reseller name, reseller ID, account ID..."
                      className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">OCS reseller ID</span>
                    <select
                      value={form.ocsResellerId}
                      onChange={(event) => selectReseller(event.target.value)}
                      className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
                    >
                      <option value="">Select reseller...</option>
                      {filteredOcsResellers.map((reseller) => (
                        <option key={reseller.ocsResellerId} value={reseller.ocsResellerId}>
                          {reseller.name} · reseller {reseller.ocsResellerId} · {formatBalance(reseller.balance)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">OCS account ID</span>
                    <select
                      value={form.ocsAccountId}
                      onChange={(event) => setForm((current) => ({ ...current, ocsAccountId: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
                    >
                      <option value="">Default account</option>
                      {selectedReseller?.accounts.map((account) => (
                        <option key={account.ocsAccountId} value={account.ocsAccountId}>
                          #{account.ocsAccountId} · {account.name ?? "Account"} · {formatBalance(account.balance)}{account.packageOnly ? " · package only" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextInput label="Stripe profile ID" value={form.stripeProfileId} onChange={(value) => setForm((current) => ({ ...current, stripeProfileId: value }))} />
                  <TextInput label="Stripe connected account" value={form.stripeAccountId} onChange={(value) => setForm((current) => ({ ...current, stripeAccountId: value }))} />
                  <TextInput label="Rate limit per minute" inputMode="numeric" value={form.rateLimitPerMinute} onChange={(value) => setForm((current) => ({ ...current, rateLimitPerMinute: value }))} />
                </div>
              </fieldset>

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
            </>
          ) : (
            <div className="mt-4 rounded-md border border-lime-200 bg-white p-3 text-xs leading-5 text-slate-600">
              Superadmin accounts have full access and do not need OCS reseller/account routing.
            </div>
          )}

          <Button type="submit" className="mt-4 w-full" disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : `Create ${roleLabel(form.userType)}`}
          </Button>
        </form>
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

function formatBalance(value: string | number | null) {
  if (value === null || value === undefined || value === "") return "Balance unavailable";
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parsed);
}
