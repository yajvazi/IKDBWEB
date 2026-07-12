import { ArrowDown, Database, Globe2, LockKeyhole, Server, ShieldCheck, Smartphone, Webhook } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getDb } from "@/server/db/client";
import { getEnv } from "@/server/ocs/config";

export const dynamic = "force-dynamic";

type ProxyLog = {
  created_at: string | null;
  request_id: string | null;
  internal_endpoint: string | null;
  upstream_command: string | null;
  method: string | null;
  result: string | null;
  ocs_status_code: number | null;
  http_status: number | null;
  duration_ms: number | null;
  retry_count: number | null;
  environment: string | null;
};

export default async function ApiProxyPage() {
  const env = getEnv();
  const logs = await getProxyLogs();
  const health = [
    ["Proxy health", "Healthy", "success"],
    ["OCS upstream health", env.OCS_MOCK_MODE ? "Live mode required" : "Live configured", env.OCS_MOCK_MODE ? "warning" : "success"],
    ["Average latency", averageLatency(logs), logs.length > 0 ? "success" : "neutral"],
    ["Error rate", errorRate(logs), "success"],
    ["Last OCS request", logs[0]?.created_at ? formatDate(logs[0].created_at) : "No logs", "neutral"],
    ["Stripe webhook", process.env.STRIPE_WEBHOOK_SECRET ? "Configured" : "Missing", process.env.STRIPE_WEBHOOK_SECRET ? "success" : "error"],
    ["Queue status", "Database-backed", "info"],
    ["Database status", getDb() ? "Connected" : "Not configured", getDb() ? "success" : "error"],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950">API Proxy</h1>
        <p className="mt-1 text-sm text-slate-500">Secure OCS adapter, redacted proxy logs, correlation IDs, and upstream health.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {health.map(([label, value, tone]) => (
          <article key={label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase text-slate-500">{label}</div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xl font-bold text-slate-950">{value}</div>
              <StatusBadge tone={tone}>{tone}</StatusBadge>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Architecture Overview</h2>
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-[1fr_auto_1fr_auto_1.3fr] xl:items-center">
          <div className="grid grid-cols-2 gap-3">
            <Box icon={<Smartphone className="h-5 w-5" />} title="Mobile app" />
            <Box icon={<Globe2 className="h-5 w-5" />} title="Website" />
          </div>
          <ArrowDown className="hidden h-5 w-5 -rotate-90 text-slate-400 xl:block" />
          <Box icon={<ShieldCheck className="h-5 w-5" />} title="Authentication and rate limiting" subtitle="JWT, ownership checks, RBAC" />
          <ArrowDown className="hidden h-5 w-5 -rotate-90 text-slate-400 xl:block" />
          <div className="grid gap-3">
            <Box icon={<Server className="h-5 w-5" />} title="InternetKudo API Gateway" subtitle="Validation, normalization, audit logging" strong />
            <div className="grid grid-cols-3 gap-3">
              <Box icon={<Database className="h-4 w-4" />} title="Database" compact />
              <Box icon={<Webhook className="h-4 w-4" />} title="Stripe" compact />
              <Box icon={<LockKeyhole className="h-4 w-4" />} title="OCS API" compact />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-border">
                {["Timestamp", "Request ID", "Internal endpoint", "Upstream command", "Method", "Result", "OCS", "HTTP", "Duration", "Retries", "Env"].map((head) => (
                  <th key={head} className="py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.request_id ?? `${row.created_at}-${row.upstream_command}`} className="border-b border-border/70 last:border-0">
                  <td className="py-3 text-slate-500">{formatDate(row.created_at)}</td>
                  <td className="py-3 font-mono text-xs font-bold text-primary">{row.request_id ?? "n/a"}</td>
                  <td className="py-3 text-slate-700">{row.internal_endpoint ?? "n/a"}</td>
                  <td className="py-3 text-slate-700">{row.upstream_command ?? "n/a"}</td>
                  <td className="py-3">{row.method ?? "POST"}</td>
                  <td className="py-3">{row.result ?? "n/a"}</td>
                  <td className="py-3">{row.ocs_status_code ?? "n/a"}</td>
                  <td className="py-3"><StatusBadge tone={(row.http_status ?? 0) >= 400 ? "error" : "success"}>{row.http_status ?? "n/a"}</StatusBadge></td>
                  <td className="py-3">{row.duration_ms ?? 0} ms</td>
                  <td className="py-3">{row.retry_count ?? 0}</td>
                  <td className="py-3"><StatusBadge tone="info">{row.environment ?? "LIVE"}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-slate-50 p-6 text-sm font-medium text-slate-500">
              No persisted OCS proxy logs found.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

async function getProxyLogs(): Promise<ProxyLog[]> {
  const db = getDb();
  if (!db) return [];
  try {
    return await db<ProxyLog[]>`
      select created_at, request_id, internal_endpoint, upstream_command, method, result,
             ocs_status_code, http_status, duration_ms, retry_count, environment
      from ocs_proxy_logs
      order by created_at desc
      limit 50
    `;
  } catch {
    return [];
  }
}

function averageLatency(logs: ProxyLog[]) {
  if (logs.length === 0) return "No logs";
  const total = logs.reduce((sum, row) => sum + Number(row.duration_ms ?? 0), 0);
  return `${Math.round(total / logs.length)} ms`;
}

function errorRate(logs: ProxyLog[]) {
  if (logs.length === 0) return "0%";
  const failed = logs.filter((row) => Number(row.http_status ?? 0) >= 400 || Number(row.ocs_status_code ?? 0) > 0).length;
  return `${((failed / logs.length) * 100).toFixed(1)}%`;
}

function formatDate(value: unknown) {
  if (!value) return "n/a";
  return new Date(String(value)).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Box({ icon, title, subtitle, strong = false, compact = false }: { icon: React.ReactNode; title: string; subtitle?: string; strong?: boolean; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-slate-50 p-4 ${strong ? "bg-blue-50 ring-1 ring-blue-100" : ""} ${compact ? "p-3" : ""}`}>
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm font-bold text-slate-950">{title}</span></div>
      {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
