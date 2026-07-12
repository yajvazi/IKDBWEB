"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { showToast } from "@/lib/toastify";

type AdminRole = "super_admin" | "operations" | "finance" | "support" | "analyst" | "developer" | "read_only";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  lastLoginAt?: string;
  disabledAt?: string;
};

const roles: AdminRole[] = ["super_admin", "operations", "finance", "support", "analyst", "developer", "read_only"];

function roleLabel(role: string) {
  return role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminAccountManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("operations");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void loadUsers(false);
  }, []);

  async function loadUsers(notify = true) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/auth/users", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to load admin users.");
      setUsers(json.data.users);
      if (notify) showToast("Admin accounts refreshed.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load admin users.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch("/api/admin/auth/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to create admin account.");

      setName("");
      setEmail("");
      setRole("operations");
      setPassword("");
      setUsers((current) => [json.data.user, ...current]);
      showToast("Admin account created.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create admin account.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-slate-950">Admin account access</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">Create and review accounts that can unlock this dashboard.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => loadUsers(true)} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh accounts
        </Button>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.8fr] border-b border-border bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <span>Admin</span>
            <span>Role</span>
            <span>Status</span>
            <span>Last login</span>
          </div>
          <div className="max-h-80 overflow-auto">
            {users.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">{loading ? "Loading admin accounts..." : "No admin accounts found."}</div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="grid grid-cols-[1.1fr_0.8fr_0.7fr_0.8fr] items-center gap-3 border-b border-border px-3 py-3 text-sm last:border-0">
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

        <form className="rounded-lg border border-blue-100 bg-blue-50 p-4" onSubmit={createUser}>
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
            <KeyRound className="h-4 w-4 text-primary" />
            Add admin account
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Role</span>
              <select value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4">
                {roles.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Temporary password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4" />
            </label>
            <Button type="submit" className="w-full" disabled={creating}>
              <Plus className="h-4 w-4" />
              {creating ? "Creating..." : "Create account"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

