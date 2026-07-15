"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { navItems } from "@/components/admin/admin-sidebar";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubresellerBalanceLabel, SubresellerTopupWidget } from "@/components/admin/subreseller-topup-widget";
import { adminDateRanges, normalizeAdminDateRange, setDateRangeSearchParam } from "@/lib/dates/admin-date-range";
import { cn } from "@/lib/utils";

type HeaderAdmin = {
  email: string;
  name: string;
  role: string;
};

function roleLabel(role: string) {
  return role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function initials(admin: HeaderAdmin) {
  const source = admin.name || admin.email;
  const parts = source.split(/[ @._-]/).filter(Boolean);
  return (parts[0]?.[0] ?? "I").concat(parts[1]?.[0] ?? "K").toUpperCase();
}

export function AdminHeader({ admin }: { admin: HeaderAdmin }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dateRange = useMemo(() => normalizeAdminDateRange(searchParams.get("range")), [searchParams]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setDateOpen(false);
        setNotificationsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setProfileOpen(false);
        setDateOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function runGlobalSearch() {
    const query = globalSearch.trim();
    if (!query) return;
    const lower = query.toLowerCase();
    const route =
      lower.includes("payment") || lower.startsWith("pi_")
        ? "/admin/payments"
        : lower.includes("customer") || query.includes("@")
          ? "/admin/customers"
          : lower.includes("esim") || lower.includes("iccid")
            ? "/admin/esims"
            : "/admin/orders";
    router.push(`${route}?search=${encodeURIComponent(query)}`);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3" ref={controlsRef}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-admin-navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="relative w-full max-w-xl lg:max-w-[520px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                suppressHydrationWarning
                className="h-10 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm outline-none ring-primary/20 transition focus:ring-4"
                placeholder="Search orders, customers, eSIMs..."
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runGlobalSearch();
                }}
              />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-2 md:gap-3">
            <div className="relative hidden md:block">
          <button
            className="flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none ring-primary/20 transition hover:bg-slate-50 focus:ring-4"
            aria-haspopup="menu"
            aria-expanded={dateOpen}
            onClick={() => {
              setDateOpen((open) => !open);
              setNotificationsOpen(false);
            }}
          >
            <CalendarDays className="h-4 w-4 text-slate-500" />
            {dateRange}
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {dateOpen ? (
            <div role="menu" className="absolute right-0 top-12 z-20 w-48 rounded-lg border border-border bg-white p-2 shadow-xl shadow-slate-950/10">
              {adminDateRanges.map((range) => (
                <button
                  key={range}
                  role="menuitem"
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                  onClick={() => {
                    setDateOpen(false);
                    router.push(`${pathname}?${setDateRangeSearchParam(searchParams, range).toString()}`);
                    router.refresh();
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          ) : null}
            </div>

            <div className="relative">
          <button
            className="relative grid h-10 w-10 place-items-center rounded-md border border-border bg-white text-slate-600 shadow-sm outline-none ring-primary/20 transition hover:bg-slate-50 focus:ring-4"
            aria-label="Open notifications"
            aria-haspopup="menu"
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setDateOpen(false);
            }}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
          </button>
          {notificationsOpen ? (
            <div role="menu" className="absolute right-0 top-12 z-20 w-80 rounded-lg border border-border bg-white p-2 shadow-xl shadow-slate-950/10">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</div>
              {[
                ["Stripe webhook active", "Last event processed successfully.", "/admin/webhooks"],
                ["OCS proxy healthy", "No unsafe upstream errors in the current window.", "/admin/api-proxy"],
                ["Provisioning queue", "4 jobs waiting for worker pickup.", "/admin/orders"],
              ].map(([title, detail, href]) => (
                <Link
                  key={title}
                  role="menuitem"
                  href={href}
                  className="block rounded-md px-3 py-2 hover:bg-blue-50"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <span className="block text-sm font-bold text-slate-900">{title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{detail}</span>
                </Link>
              ))}
            </div>
          ) : null}
            </div>

            <div className="relative" ref={profileRef}>
          <button
            className="flex items-center gap-3 rounded-md border border-border bg-white px-2 py-1.5 shadow-sm outline-none ring-primary/20 transition hover:bg-slate-50 focus:ring-4"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <div className="hidden text-right sm:block">
              <div className="text-xs font-bold text-slate-900">{admin.name}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{roleLabel(admin.role)}</div>
              <SubresellerBalanceLabel />
            </div>
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-bold text-white" aria-label="Admin profile">
              {initials(admin)}
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-12 w-64 rounded-lg border border-border bg-white p-2 shadow-xl shadow-slate-950/10"
            >
              <div className="border-b border-border px-3 py-3">
                <div className="text-sm font-bold text-slate-950">{admin.name}</div>
                <div className="mt-1 text-xs text-slate-500">{admin.email}</div>
                <StatusBadge tone="info" className="mt-2">
                  {roleLabel(admin.role)}
                </StatusBadge>
              </div>
              <SubresellerTopupWidget variant="menu" />
              <Link
                role="menuitem"
                href="/admin/users"
                className="mt-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                onClick={() => setProfileOpen(false)}
              >
                <UserRound className="h-4 w-4" />
                Admin profile
              </Link>
              <Link
                role="menuitem"
                href="/admin/settings"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                onClick={() => setProfileOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Link
                role="menuitem"
                href="/admin/help"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                onClick={() => setProfileOpen(false)}
              >
                <CircleHelp className="h-4 w-4" />
                Help Center
              </Link>
              <button
                role="menuitem"
                className="mt-2 flex w-full items-center gap-3 rounded-md border-t border-border px-3 py-2 pt-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={signOut}
                disabled={signingOut}
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : null}
          </div>
          </div>
        </div>
      </header>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-admin-navigation">
          <div
            className="absolute inset-0 z-0 bg-slate-950/40"
            aria-hidden="true"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 z-10 flex w-[288px] max-w-[82vw] flex-col overflow-y-auto border-r border-border bg-white p-4 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <Link href="/admin/dashboard" className="text-lg font-bold text-primary">
                internetkudo
              </Link>
              <Button variant="outline" size="icon" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-primary",
                      active && "bg-primary text-white shadow-sm hover:bg-primary hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto rounded-md bg-slate-50 px-3 py-2 text-[11px] font-semibold">
              <div className="flex items-center justify-between text-green-700">
                <span>API Active</span>
                <span className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-500">
                <span>LIVE</span>
                <span>v0.1.0</span>
              </div>
            </div>
            <Link
              href="/admin/help"
              onClick={() => setMobileNavOpen(false)}
              className="mt-3 flex items-center gap-3 rounded-md border border-border bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-blue-50 hover:text-primary"
            >
              <CircleHelp className="h-4 w-4" />
              Help Center
            </Link>
          </aside>
        </div>
      ) : null}
    </>
  );
}
