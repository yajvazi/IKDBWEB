export const adminPageOptions = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
  { key: "orders", label: "Orders", href: "/admin/orders" },
  { key: "packages", label: "Packages", href: "/admin/packages" },
  { key: "creation", label: "Creation Panel", href: "/admin/creation" },
  { key: "customers", label: "Customers", href: "/admin/customers" },
  { key: "esims", label: "eSIMs", href: "/admin/esims" },
  { key: "payments", label: "Payments", href: "/admin/payments" },
  { key: "analytics", label: "Analytics", href: "/admin/analytics" },
  { key: "api-proxy", label: "API Proxy", href: "/admin/api-proxy" },
  { key: "api-docs", label: "Swagger Docs", href: "/admin/api-docs" },
  { key: "webhooks", label: "Webhook Logs", href: "/admin/webhooks" },
  { key: "audit-logs", label: "Audit Logs", href: "/admin/logs/audit" },
  { key: "admin-users", label: "Admin Users", href: "/admin/users" },
  { key: "settings", label: "Settings", href: "/admin/settings" },
] as const;

export type AdminPageKey = (typeof adminPageOptions)[number]["key"];

export const adminApiGroupOptions = [
  "Authentication",
  "Countries",
  "Plans",
  "Checkout",
  "Orders",
  "eSIMs",
  "Top-ups",
  "Notifications",
  "Wallet",
  "Referrals",
  "Support",
  "OCS Gateway",
  "Stripe",
  "Admin",
] as const;

export type AdminApiGroup = (typeof adminApiGroupOptions)[number];

export function pageKeyFromHref(href: string): AdminPageKey | null {
  return adminPageOptions.find((item) => item.href === href)?.key ?? null;
}
