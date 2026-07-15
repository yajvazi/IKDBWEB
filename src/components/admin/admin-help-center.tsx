"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  FileText,
  KeyRound,
  LifeBuoy,
  PackagePlus,
  Route,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type HelpCategory =
  | "Getting started"
  | "Operations"
  | "API Gateway"
  | "Payments"
  | "OCS"
  | "Subresellers"
  | "Security"
  | "Troubleshooting";

type HelpSection = {
  id: string;
  category: HelpCategory;
  title: string;
  summary: string;
  icon: LucideIcon;
  links?: Array<{ label: string; href: string }>;
  bullets: string[];
  details: Array<{ title: string; body: string; code?: string }>;
};

const categories: HelpCategory[] = [
  "Getting started",
  "Operations",
  "API Gateway",
  "Payments",
  "OCS",
  "Subresellers",
  "Security",
  "Troubleshooting",
];

const quickLinks = [
  { label: "Swagger Docs", href: "/admin/api-docs", icon: BookOpen, tone: "info" },
  { label: "API Proxy", href: "/admin/api-proxy", icon: Route, tone: "success" },
  { label: "Creation Panel", href: "/admin/creation", icon: PackagePlus, tone: "warning" },
  { label: "Webhook Logs", href: "/admin/webhooks", icon: Webhook, tone: "info" },
  { label: "Audit Logs", href: "/admin/logs/audit", icon: ShieldCheck, tone: "success" },
  { label: "Settings", href: "/admin/settings", icon: Settings2, tone: "warning" },
] as const;

const sections: HelpSection[] = [
  {
    id: "start",
    category: "Getting started",
    title: "Admin platform overview",
    summary: "How the InternetKudo admin dashboard, mobile API, Stripe, Supabase, and OCS gateway fit together.",
    icon: LifeBuoy,
    links: [
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "API Proxy", href: "/admin/api-proxy" },
      { label: "Swagger Docs", href: "/admin/api-docs" },
    ],
    bullets: [
      "The mobile app and website should call the InternetKudo API Gateway, never Stripe secret APIs or OCS directly.",
      "The dashboard controls orders, packages, eSIMs, payments, subresellers, and proxy logs from one protected admin shell.",
      "Use Swagger Docs to test normalized InternetKudo endpoints and the Creation Panel for controlled OCS workflows.",
      "All sensitive identifiers should stay masked in UI views unless a privileged user reveals them with an audit trail.",
    ],
    details: [
      {
        title: "Production data flow",
        body: "The customer app selects a plan, the API Gateway validates price and ownership, Stripe captures payment, a webhook records payment success, and a provisioning job assigns the package through OCS.",
        code: "Mobile app / Website -> InternetKudo API Gateway -> Supabase\n                                      -> Stripe\n                                      -> OCS reseller API",
      },
      {
        title: "Where to start each day",
        body: "Open Dashboard for high-level revenue and health, API Proxy for upstream failures, Webhook Logs for Stripe delivery, and Orders for stuck provisioning or refunds.",
      },
    ],
  },
  {
    id: "daily-operations",
    category: "Operations",
    title: "Daily operations runbook",
    summary: "The normal checklist for monitoring sales, provisioning, failed payments, and customer issues.",
    icon: Activity,
    links: [
      { label: "Orders", href: "/admin/orders" },
      { label: "eSIMs", href: "/admin/esims" },
      { label: "Payments", href: "/admin/payments" },
    ],
    bullets: [
      "Check API Active, database status, OCS upstream health, queue status, and Stripe webhook status first.",
      "Review failed payments and retryable provisioning failures before handling manual customer support requests.",
      "Use the date selector in the header to keep Dashboard, Analytics, and table pages in the same reporting window.",
      "Use action menus to view details, retry provisioning, resend installation instructions, and inspect proxy logs.",
    ],
    details: [
      {
        title: "Order triage",
        body: "Paid orders should move from paid to provisioning to fulfilled. If an order is paid but not fulfilled, inspect OCS proxy logs and webhook logs before retrying.",
      },
      {
        title: "Customer support triage",
        body: "Search by email, order number, ICCID, activation code, PaymentIntent, or subscriber ID. Keep activation details masked unless the role has reveal permission.",
      },
    ],
  },
  {
    id: "mobile-api",
    category: "API Gateway",
    title: "Mobile app and website API guide",
    summary: "Normalized endpoints the InternetKudo app and public website should use instead of raw upstream calls.",
    icon: Smartphone,
    links: [
      { label: "Swagger Docs", href: "/admin/api-docs" },
      { label: "API Proxy Logs", href: "/admin/api-proxy" },
    ],
    bullets: [
      "Use `/api/v1/countries` and `/api/v1/plans` for browsing plans.",
      "Use `/api/v1/checkout/payment-intent` to start payment and let Stripe confirm payment through webhooks.",
      "Use `/api/v1/orders` and `/api/v1/esims` for authenticated customer history and installation details.",
      "Never send OCS credentials, reseller IDs, Stripe secret keys, or internal account mappings to mobile clients.",
    ],
    details: [
      {
        title: "Example checkout call",
        body: "The app should request a PaymentIntent from the gateway. The server validates the plan, price, reseller context, and customer before creating Stripe payment state.",
        code: "POST /api/v1/checkout/payment-intent\n{\n  \"planId\": \"plan_turkey_10gb_30d\",\n  \"quantity\": 1,\n  \"currency\": \"eur\"\n}",
      },
      {
        title: "Example eSIM usage call",
        body: "Usage responses are normalized by the gateway so the app does not need to understand OCS package response fields.",
        code: "GET /api/v1/esims/{esimId}/usage\nAuthorization: Bearer <customer_jwt>",
      },
    ],
  },
  {
    id: "ocs",
    category: "OCS",
    title: "OCS gateway and package creation",
    summary: "How to use OCS safely through the dashboard and proxy without exposing upstream credentials.",
    icon: Server,
    links: [
      { label: "Creation Panel", href: "/admin/creation" },
      { label: "API Proxy", href: "/admin/api-proxy" },
      { label: "Packages", href: "/admin/packages" },
    ],
    bullets: [
      "Package template dropdowns should come from `listPrepaidPackageTemplate` by reseller context.",
      "Account dropdowns should come from OCS account/reseller lists, but subresellers only see their assigned account.",
      "Package assignment uses `affectPackageToSubscriber` with `packageTemplateId`, `accountForSubs`, and `validityPeriod`.",
      "Creation results should show ICCID, SM-DP+ server, activation code, QR payload, subscriber ID, eSIM ID, package ID, and user SIM name.",
    ],
    details: [
      {
        title: "Package assignment request",
        body: "This is the controlled OCS command used for assigning a package through the InternetKudo dashboard and proxy.",
        code: "{\n  \"affectPackageToSubscriber\": {\n    \"packageTemplateId\": 553,\n    \"accountForSubs\": 40,\n    \"validityPeriod\": 30\n  }\n}",
      },
      {
        title: "Subscriber package lookup",
        body: "The proxy supports subscriber ID, IMSI, ICCID, MSISDN, multi-IMSI, or activation code, but should prefer subscriber ID once known.",
        code: "{\n  \"listSubscriberPrepaidPackages\": {\n    \"subscriberId\": 1000\n  }\n}",
      },
    ],
  },
  {
    id: "payments",
    category: "Payments",
    title: "Stripe payments, webhooks, and reconciliation",
    summary: "How payment capture, webhook processing, refunds, fees, and dashboard numbers work.",
    icon: CreditCard,
    links: [
      { label: "Payments", href: "/admin/payments" },
      { label: "Webhook Logs", href: "/admin/webhooks" },
      { label: "Settings", href: "/admin/settings" },
    ],
    bullets: [
      "PaymentIntent creation happens on the server and uses Stripe idempotency keys.",
      "Do not provision eSIMs because the client says payment succeeded. Provision only after verified Stripe webhook success.",
      "Dashboard revenue and payment counts use synced Stripe data and respect the selected date range.",
      "Refunds and disputes should be reconciled back into local orders, payment state, and customer support history.",
    ],
    details: [
      {
        title: "Webhook events to watch",
        body: "The most important events are `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`.",
      },
      {
        title: "Subreseller top-ups",
        body: "Top-ups create a Stripe PaymentIntent first. After successful capture, the system calculates net amount after Stripe fees and applies the OCS reseller balance update.",
      },
    ],
  },
  {
    id: "supabase",
    category: "Getting started",
    title: "Supabase database and cached data",
    summary: "What data should live in Supabase and why Stripe/OCS snapshots are cached locally.",
    icon: Database,
    links: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Customers", href: "/admin/customers" },
      { label: "Orders", href: "/admin/orders" },
    ],
    bullets: [
      "Supabase stores customers, orders, payments, eSIMs, packages, subreseller settings, webhook events, and audit logs.",
      "Stripe lists can be cached so dashboard pages do not re-fetch all history on every request.",
      "Historical orders should keep the original retail price, reseller cost, Stripe fee, and gross profit.",
      "Sensitive eSIM activation fields should be encrypted at rest and masked in normal UI.",
    ],
    details: [
      {
        title: "Local cache rule",
        body: "Cache external provider records for performance, but treat provider IDs and webhook event IDs as the source of reconciliation truth.",
      },
      {
        title: "Data retention rule",
        body: "Keep audit logs, webhook events, proxy logs, and order state changes long enough to diagnose payments, provisioning, refunds, and support issues.",
      },
    ],
  },
  {
    id: "subresellers",
    category: "Subresellers",
    title: "Subreseller and vendor access",
    summary: "How super admins configure limited users, reseller/account mapping, Stripe mode, and balance top-ups.",
    icon: Users,
    links: [
      { label: "Admin Users", href: "/admin/users" },
      { label: "Settings", href: "/admin/settings" },
      { label: "Dashboard", href: "/admin/dashboard" },
    ],
    bullets: [
      "Use one user creation panel for super admin, subreseller, and vendor users.",
      "Assign allowed dashboard pages, allowed API groups, OCS reseller ID, account ID, and Stripe credentials per subreseller.",
      "Subresellers should only see their own OCS reseller/account context in Creation Panel and Dashboard.",
      "Super admins can set minimum top-up amount and toggle Stripe test/live mode for testing or production.",
    ],
    details: [
      {
        title: "Access model",
        body: "Super admins have full access. Subresellers and vendors receive explicit page/API permissions, reseller context, and optional independent Stripe configuration.",
      },
      {
        title: "Balance display",
        body: "The header profile and dashboard should show the current OCS reseller balance for the logged-in subreseller context, not the super admin account.",
      },
    ],
  },
  {
    id: "security",
    category: "Security",
    title: "Security and compliance checklist",
    summary: "Operational rules for secrets, masking, rate limits, role enforcement, and audit trails.",
    icon: ShieldCheck,
    links: [
      { label: "Audit Logs", href: "/admin/logs/audit" },
      { label: "API Proxy", href: "/admin/api-proxy" },
      { label: "Admin Users", href: "/admin/users" },
    ],
    bullets: [
      "Never expose OCS passwords, OCS tokens, Stripe secret keys, webhook secrets, or authorization headers to client JavaScript.",
      "Mask full activation codes, QR payloads, ICCID, IMSI, MSISDN, and subscriber identifiers in ordinary logs.",
      "Enforce roles and resource ownership server-side. Hidden UI buttons are not a security boundary.",
      "Audit every reveal of sensitive activation data, package transfer, refund, retry, balance top-up, and permission change.",
    ],
    details: [
      {
        title: "Secret handling",
        body: "Use environment variables and server-only modules for OCS and Stripe credentials. Redact secrets before logs, errors, API responses, and Swagger examples.",
      },
      {
        title: "Admin account hygiene",
        body: "Use strong passwords, rotate credentials after sharing, review user permissions regularly, and remove users who no longer need dashboard access.",
      },
    ],
  },
  {
    id: "troubleshooting",
    category: "Troubleshooting",
    title: "Troubleshooting common failures",
    summary: "Fast checks for page loading, Stripe card form, duplicate package names, OCS errors, and missing data.",
    icon: AlertTriangle,
    links: [
      { label: "API Proxy", href: "/admin/api-proxy" },
      { label: "Webhook Logs", href: "/admin/webhooks" },
      { label: "Orders", href: "/admin/orders" },
    ],
    bullets: [
      "If a page does not load, check PM2 status, Nginx routing, server logs, and whether the admin session is valid.",
      "If Stripe card input does not show, verify publishable key mode, Stripe.js loading, Content Security Policy, and PaymentIntent client secret.",
      "If OCS returns duplicate package template name, use the account package assignment flow instead of creating duplicate upstream templates.",
      "If dashboard numbers look wrong, refresh synced Stripe data and confirm the selected date range.",
    ],
    details: [
      {
        title: "Useful server commands",
        body: "Run these on the VPS when diagnosing runtime problems.",
        code: "pm2 status internetkudo-admin\npm2 logs internetkudo-admin --lines 100\nsudo nginx -t\ncurl -I https://admin.internetkudo.com/admin/dashboard",
      },
      {
        title: "OCS upstream error",
        body: "Open API Proxy, find the request ID, review the redacted upstream payload and OCS status code, then retry only if the command is safe or idempotent.",
      },
    ],
  },
];

const supportCards = [
  {
    title: "For customer support",
    icon: LifeBuoy,
    items: ["Search by email, order number, ICCID, or PaymentIntent.", "Open order details before resending installation details.", "Never reveal full activation data without permission."],
  },
  {
    title: "For finance",
    icon: WalletCards,
    items: ["Check Payments and Webhooks before refunding.", "Compare gross revenue, Stripe fees, reseller cost, and gross profit.", "Use reconciliation status to find missing provider events."],
  },
  {
    title: "For developers",
    icon: KeyRound,
    items: ["Use Swagger Docs for normalized InternetKudo APIs.", "Use API Proxy logs to inspect redacted OCS requests.", "Keep new mobile endpoints versioned under `/api/v1`."],
  },
];

export function AdminHelpCenter() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "All">("All");

  const filteredSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sections.filter((section) => {
      const matchesCategory = category === "All" || section.category === category;
      const searchable = [
        section.category,
        section.title,
        section.summary,
        ...section.bullets,
        ...section.details.flatMap((detail) => [detail.title, detail.body, detail.code ?? ""]),
      ].join(" ").toLowerCase();
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
  }, [category, query]);

  async function copySnippet(snippet: string) {
    await navigator.clipboard.writeText(snippet);
    showToast("Copied to clipboard.", "success");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="grid gap-6 bg-[radial-gradient(circle_at_top_right,rgba(110,248,37,0.24),transparent_34%),linear-gradient(135deg,#004FFE_0%,#0B3DBE_52%,#111827_100%)] p-6 text-white lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-white/20">
              <LifeBuoy className="h-3.5 w-3.5 text-[#6EF825]" />
              InternetKudo Help Center
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Operations docs for the admin platform and API gateway.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Find setup guidance, daily runbooks, OCS and Stripe workflows, mobile API notes, security rules, and troubleshooting steps in one searchable page.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Live gateway", "API and OCS proxy guidance"],
                ["Payments", "Stripe capture, webhooks, refunds"],
                ["Operations", "Orders, eSIMs, support, audits"],
              ].map(([label, detail]) => (
                <div key={label} className="rounded-lg border border-white/15 bg-white/10 p-3 backdrop-blur">
                  <div className="text-sm font-bold">{label}</div>
                  <div className="mt-1 text-xs text-blue-100">{detail}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl shadow-slate-950/20">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick actions</div>
            <div className="mt-3 grid gap-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary/30 hover:bg-blue-50 hover:text-primary"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-border bg-white pl-10 pr-3 text-sm outline-none ring-primary/20 transition focus:ring-4"
              placeholder="Search docs, runbooks, API names, Stripe, OCS, Supabase..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {(["All", ...categories] as const).map((item) => (
              <button
                key={item}
                className={cn(
                  "h-9 shrink-0 rounded-lg border px-3 text-xs font-bold transition",
                  category === item ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-white text-slate-600 hover:bg-blue-50 hover:text-primary",
                )}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[260px_1fr_320px]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-500">On this page</div>
            <nav className="space-y-1">
              {filteredSections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="block rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-primary">
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="space-y-4">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.id} id={section.id} className="scroll-mt-24 rounded-xl border border-border bg-white shadow-sm">
                <div className="border-b border-border p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
                          <StatusBadge tone={section.category === "Troubleshooting" ? "warning" : section.category === "Security" ? "success" : "info"}>
                            {section.category}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{section.summary}</p>
                      </div>
                    </div>
                    {section.links?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {section.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-primary"
                          >
                            {link.label}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                  <div className="space-y-3">
                    {section.bullets.map((item) => (
                      <div key={item} className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {section.details.map((detail, index) => (
                      <details key={detail.title} open={index === 0} className="group rounded-lg border border-border bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-bold text-slate-900">
                          {detail.title}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 group-open:bg-blue-50 group-open:text-primary">
                            {detail.code ? "Example" : "Read"}
                          </span>
                        </summary>
                        <div className="border-t border-border px-3 py-3 text-sm leading-6 text-slate-600">
                          <p>{detail.body}</p>
                          {detail.code ? (
                            <div className="mt-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Snippet</span>
                                <button className="inline-flex items-center gap-1 text-xs font-bold text-blue-200 hover:text-white" onClick={() => copySnippet(detail.code ?? "")}>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </button>
                              </div>
                              <pre className="overflow-x-auto p-3 text-xs leading-5 text-blue-50"><code>{detail.code}</code></pre>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}

          {filteredSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center shadow-sm">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <h2 className="mt-3 text-lg font-bold text-slate-950">No help topics found</h2>
              <p className="mt-1 text-sm text-slate-500">Try another keyword or clear the selected category.</p>
              <Button className="mt-4" size="sm" onClick={() => {
                setQuery("");
                setCategory("All");
              }}>
                Clear filters
              </Button>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-slate-950">Need a specific doc?</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Use Swagger for request/response examples, API Proxy for upstream OCS diagnostics, and Audit Logs for sensitive admin actions.
            </p>
            <div className="mt-3 grid gap-2">
              <Link className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-primary hover:bg-blue-100" href="/admin/api-docs">
                Open Swagger Docs
              </Link>
              <Link className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/admin/logs/audit">
                Review Audit Logs
              </Link>
            </div>
          </div>

          {supportCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-950">{card.title}</h2>
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
                  {card.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6EF825]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </aside>
      </div>
    </div>
  );
}
