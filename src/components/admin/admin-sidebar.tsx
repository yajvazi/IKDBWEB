"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  CircleHelp,
  CreditCard,
  FileClock,
  Globe2,
  KeyRound,
  LayoutDashboard,
  ListOrdered,
  Package,
  PackagePlus,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ListOrdered },
  { label: "Packages", href: "/admin/packages", icon: Package },
  { label: "Creation Panel", href: "/admin/creation", icon: PackagePlus },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "eSIMs", href: "/admin/esims", icon: Smartphone },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "API Proxy", href: "/admin/api-proxy", icon: Activity },
  { label: "Swagger Docs", href: "/admin/api-docs", icon: BookOpen },
  { label: "Webhook Logs", href: "/admin/webhooks", icon: FileClock },
  { label: "Audit Logs", href: "/admin/logs/audit", icon: ShieldCheck },
  { label: "Admin Users", href: "/admin/users", icon: KeyRound },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export { navItems };

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[232px] shrink-0 border-r border-border bg-sidebar px-4 py-5 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link href="/admin/dashboard" className="mb-7 flex items-center">
        <Image src="/branding/internetkudo-logo.svg" alt="InternetKudo" width={158} height={32} priority />
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-primary",
                active && "bg-primary text-white shadow-sm hover:bg-primary hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 rounded-md border border-border bg-white px-3 py-3 text-xs text-slate-600 shadow-sm"
        >
          <CircleHelp className="h-4 w-4 text-primary" />
          <span>
            <span className="block font-semibold text-slate-800">Need help?</span>
            Help Center
          </span>
        </Link>
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 font-semibold text-green-700">
            <Globe2 className="h-3.5 w-3.5" />
            LIVE
          </span>
          <span>v0.1.0</span>
        </div>
      </div>
    </aside>
  );
}
