"use client";

import { Copy, Play, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";

type Endpoint = {
  group: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  safeTry: boolean;
  body?: unknown;
};

const endpoints: Endpoint[] = [
  { group: "Mobile App", method: "GET", path: "/api/v1/app/bootstrap", summary: "Load app configuration and feature flags", safeTry: true },
  { group: "Mobile App", method: "GET", path: "/api/v1/app/onboarding", summary: "Load onboarding slides", safeTry: true },
  { group: "Mobile App", method: "GET", path: "/api/v1/app/home", summary: "Load home screen content", safeTry: true },
  { group: "Authentication", method: "GET", path: "/api/v1/auth/me", summary: "Current customer", safeTry: true },
  { group: "Profile", method: "GET", path: "/api/v1/profile", summary: "Get profile", safeTry: true },
  { group: "Profile", method: "PATCH", path: "/api/v1/profile", summary: "Update profile", safeTry: true, body: { name: "Yil Alvazi", marketingOptIn: true, preferredCurrency: "EUR" } },
  { group: "Countries", method: "GET", path: "/api/v1/countries", summary: "List supported countries", safeTry: true },
  { group: "Countries", method: "GET", path: "/api/v1/countries/TR", summary: "Get country detail", safeTry: true },
  { group: "Countries", method: "GET", path: "/api/v1/countries/TR/plans", summary: "List country plans", safeTry: true },
  { group: "Plans", method: "GET", path: "/api/v1/plans", summary: "List sellable plans", safeTry: true },
  { group: "Search", method: "GET", path: "/api/v1/search?q=Japan", summary: "Search countries and plans", safeTry: true },
  { group: "Cart", method: "GET", path: "/api/v1/cart/quote?planId=pkg_1657099&quantity=1", summary: "Quote cart from query params", safeTry: true },
  { group: "Cart", method: "POST", path: "/api/v1/cart/quote", summary: "Quote cart", safeTry: true, body: { planId: "pkg_1657099", quantity: 1, referralCode: "KUDO123", kudoPointsToRedeem: 0 } },
  { group: "Orders", method: "GET", path: "/api/v1/orders", summary: "List customer orders", safeTry: true },
  { group: "Checkout", method: "POST", path: "/api/v1/checkout/payment-intent", summary: "Create Stripe PaymentSheet intent", safeTry: true, body: { planId: "pkg_1657099", quantity: 1, currency: "EUR" } },
  { group: "eSIMs", method: "GET", path: "/api/v1/esims", summary: "List customer eSIMs", safeTry: true },
  { group: "eSIMs", method: "GET", path: "/api/v1/esims/esim_102/usage", summary: "Get eSIM usage", safeTry: true },
  { group: "eSIMs", method: "GET", path: "/api/v1/esims/esim_102/installation", summary: "Get eSIM installation QR/manual data", safeTry: true },
  { group: "Payment Methods", method: "GET", path: "/api/v1/payment-methods", summary: "List payment methods", safeTry: true },
  { group: "Payment Methods", method: "POST", path: "/api/v1/payment-methods/setup-intent", summary: "Create card setup intent", safeTry: true, body: {} },
  { group: "Payment Methods", method: "PATCH", path: "/api/v1/payment-methods/pm_card_4242/default", summary: "Set default payment method", safeTry: true, body: {} },
  { group: "Payment Methods", method: "DELETE", path: "/api/v1/payment-methods/pm_card_8888", summary: "Delete payment method", safeTry: false },
  { group: "Notifications", method: "GET", path: "/api/v1/notifications", summary: "List notifications", safeTry: true },
  { group: "Wallet", method: "GET", path: "/api/v1/wallet", summary: "Get wallet", safeTry: true },
  { group: "Referrals", method: "GET", path: "/api/v1/referrals", summary: "Get referral code and rewards", safeTry: true },
  { group: "Help Center", method: "GET", path: "/api/v1/help/topics", summary: "List help topics", safeTry: true },
  { group: "Support", method: "GET", path: "/api/v1/support/tickets", summary: "List support tickets", safeTry: true },
  { group: "Support", method: "POST", path: "/api/v1/support/contact", summary: "Contact support", safeTry: true, body: { topic: "Install eSIM", message: "I need help installing my eSIM.", email: "yil@example.com" } },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/health", summary: "Check InternetKudo OCS proxy health", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/catalog", summary: "List supported proxy routes and documented OCS commands", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/reseller-accounts", summary: "List reseller accounts through the gateway", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/reseller-info?id=567", summary: "Read reseller info and balance", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/network-profiles?resellerId=567", summary: "List network profiles", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/location-zones?resellerId=567", summary: "List location zones", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/destination-lists?resellerId=567", summary: "List destination lists", safeTry: true },
  { group: "OCS Gateway", method: "GET", path: "/api/v1/ocs/package-templates?resellerId=567", summary: "List package templates and upstream prices", safeTry: true },
  {
    group: "OCS Gateway",
    method: "POST",
    path: "/api/v1/ocs/subscriber-packages/search",
    summary: "Search subscriber prepaid packages by subscriberId, IMSI, ICCID, MSISDN, multiImsi, or activationCode",
    safeTry: true,
    body: { subscriberId: 34705265 },
  },
  {
    group: "OCS Gateway",
    method: "POST",
    path: "/api/v1/ocs/package-assignments",
    summary: "Assign an OCS package template to an account with affectPackageToSubscriber",
    safeTry: false,
    body: { packageTemplateId: 553, accountId: 40, validityPeriod: 30 },
  },
  { group: "OCS Admin", method: "GET", path: "/api/admin/ocs/creation?resource=overview", summary: "Pull live OCS inventory", safeTry: true },
  { group: "OCS Admin", method: "GET", path: "/api/admin/ocs/commands", summary: "Documented OCS command catalog", safeTry: true },
  {
    group: "OCS Admin",
    method: "POST",
    path: "/api/admin/ocs/creation",
    summary: "Create an OCS location zone or package template",
    safeTry: false,
    body: {
      action: "createLocationZone",
      reason: "Created from admin creation panel",
      confirmation: "CREATE LOCATION ZONE",
      payload: { networkProfileId: 79, locationZoneName: "InternetKudo Zone", tadigList: ["BELTB"] },
    },
  },
  { group: "OpenAPI", method: "GET", path: "/api/openapi.json", summary: "OpenAPI 3.1 JSON", safeTry: true },
];

const groups = Array.from(new Set(endpoints.map((endpoint) => endpoint.group)));

export default function ApiDocsPage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("Mobile App");
  const [selectedPath, setSelectedPath] = useState("/api/v1/app/bootstrap");
  const [token, setToken] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [response, setResponse] = useState("");
  const [copied, setCopied] = useState("");

  const selected = endpoints.find((endpoint) => endpoint.path === selectedPath) ?? endpoints[0];
  const visibleEndpoints = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return endpoints.filter((endpoint) => {
      const matchesGroup = activeGroup === endpoint.group;
      const matchesSearch = !normalized || `${endpoint.group} ${endpoint.method} ${endpoint.path} ${endpoint.summary}`.toLowerCase().includes(normalized);
      return matchesGroup && matchesSearch;
    });
  }, [activeGroup, query]);

  const requestBody = bodyText || (selected.body ? JSON.stringify(selected.body, null, 2) : "");
  const snippets = codeSnippets(selected, requestBody, token);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(label);
      showToast(`${label} copied.`, "success");
    } catch {
      setCopied("Copy unavailable");
      showToast("Clipboard permission denied.", "error");
    }
    window.setTimeout(() => setCopied(""), 1500);
  }

  async function tryRequest() {
    if (!selected.safeTry) {
      setResponse(JSON.stringify({
        success: false,
        error: {
          code: "TRY_IT_OUT_DISABLED",
          message: "Destructive production requests are disabled from Swagger. Use the OCS Creation Panel for validated OCS creation with reason capture.",
        },
      }, null, 2));
      showToast("Destructive requests are disabled from Swagger.", "warning");
      return;
    }

    try {
      const result = await fetch(selected.path, {
        method: selected.method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(selected.method !== "GET" && selected.method !== "DELETE" ? { "content-type": "application/json" } : {}),
        },
        body: selected.method === "GET" || selected.method === "DELETE" ? undefined : requestBody,
      });
      const json = await result.json();
      setResponse(JSON.stringify(json, null, 2));
      showToast(result.ok ? "Request completed." : "Request returned an error.", result.ok ? "success" : "error");
    } catch (error) {
      setResponse(JSON.stringify({ success: false, error: { code: "REQUEST_FAILED", message: error instanceof Error ? error.message : "Request failed" } }, null, 2));
      showToast("Request failed.", "error");
    }
  }

  function selectEndpoint(endpoint: Endpoint) {
    setSelectedPath(endpoint.path);
    setBodyText(endpoint.body ? JSON.stringify(endpoint.body, null, 2) : "");
    setResponse("");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">Swagger Docs</h1>
        <p className="mt-1 text-sm text-slate-500">OpenAPI 3.1 documentation, examples, code snippets, and safe try-it-out for InternetKudo and OCS admin APIs.</p>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-md border border-border pl-10 pr-3 text-sm outline-none ring-primary/20 focus:ring-4"
              placeholder="Search endpoints, schemas, examples..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <input
            className="h-10 min-w-72 rounded-md border border-border px-3 text-sm outline-none ring-primary/20 focus:ring-4"
            placeholder="Bearer JWT for protected routes"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </div>

        <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)_420px]">
          <aside className="border-r border-border bg-slate-50 p-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">API groups</div>
            <nav className="space-y-1">
              {groups.map((group) => (
                <button
                  key={group}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm font-medium ${activeGroup === group ? "bg-primary text-white" : "text-slate-600 hover:bg-white"}`}
                  onClick={() => setActiveGroup(group)}
                >
                  {group}
                </button>
              ))}
            </nav>
          </aside>

          <main className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${selected.method === "GET" ? "bg-blue-50 text-primary" : "bg-lime-50 text-green-700"}`}>{selected.method}</span>
              <code className="break-all font-mono text-sm text-slate-700">{selected.path}</code>
            </div>
            <div className="space-y-3">
              {visibleEndpoints.map((endpoint) => (
                <button
                  key={`${endpoint.method}-${endpoint.path}`}
                  className={`block w-full rounded-lg border p-4 text-left ${selected.path === endpoint.path ? "border-primary bg-blue-50/50" : "border-border bg-white hover:bg-slate-50"}`}
                  onClick={() => selectEndpoint(endpoint)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <code className="break-all font-mono text-sm font-bold text-slate-800">{endpoint.method} {endpoint.path}</code>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{endpoint.safeTry ? "Try enabled" : "Docs only"}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{endpoint.summary}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-border bg-slate-50 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Request body</div>
              <textarea
                className="h-48 w-full rounded-md border border-border bg-white p-3 font-mono text-xs outline-none ring-primary/20 focus:ring-4"
                value={requestBody}
                onChange={(event) => setBodyText(event.target.value)}
                placeholder="No body for this endpoint"
              />
            </div>
          </main>

          <aside className="border-l border-border bg-slate-950 p-5 text-white">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold">Try It Out</div>
              <Button size="sm" onClick={tryRequest}><Play className="mr-2 h-4 w-4" />Send</Button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-lg bg-[#111827] p-4 text-xs leading-5 text-lime-300">{response || "Response will appear here."}</pre>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {Object.entries(snippets).map(([label, value]) => (
                <Button key={label} variant="secondary" size="sm" onClick={() => copyText(label, value)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied === label ? "Copied" : label}
                </Button>
              ))}
            </div>
            <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-white/10 p-3 text-xs leading-5 text-slate-200">{snippets.JavaScript}</pre>
          </aside>
        </div>
      </section>
    </div>
  );
}

function codeSnippets(endpoint: Endpoint, body: string, token: string) {
  const auth = token ? `Authorization: Bearer ${token}` : "Authorization: Bearer <jwt>";
  const bodyLine = endpoint.method === "GET" || endpoint.method === "DELETE" ? "" : ` \\\n  -H "content-type: application/json" \\\n  --data '${body.replaceAll("'", "'\\''")}'`;
  return {
    cURL: `curl -X ${endpoint.method} \\\n  -H "${auth}"${bodyLine} \\\n  "${typeof window === "undefined" ? "" : window.location.origin}${endpoint.path}"`,
    JavaScript: `const response = await fetch("${endpoint.path}", {\n  method: "${endpoint.method}",\n  headers: {\n    Authorization: "Bearer ${token || "<jwt>"}"${endpoint.method === "GET" || endpoint.method === "DELETE" ? "" : ',\n    "content-type": "application/json"'}\n  }${endpoint.method === "GET" || endpoint.method === "DELETE" ? "" : `,\n  body: JSON.stringify(${body || "{}"})`}\n});\nconst json = await response.json();`,
    Swift: `var request = URLRequest(url: URL(string: "${endpoint.path}")!)\nrequest.httpMethod = "${endpoint.method}"\nrequest.setValue("Bearer ${token || "<jwt>"}", forHTTPHeaderField: "Authorization")`,
    Kotlin: `client.request("${endpoint.path}") {\n  method = HttpMethod.${endpoint.method === "GET" ? "Get" : endpoint.method === "POST" ? "Post" : endpoint.method === "DELETE" ? "Delete" : "Patch"}\n  bearerAuth("${token || "<jwt>"}")\n}`,
  };
}
