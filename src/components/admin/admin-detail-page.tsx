import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminDetailActions } from "@/components/admin/admin-detail-actions";
import type { AdminWorkspaceConfig } from "@/components/admin/operations-data";

export function AdminDetailPage({
  config,
  recordId,
  backHref,
}: {
  config: AdminWorkspaceConfig;
  recordId: string;
  backHref: string;
}) {
  const record = config.records.find((item) => item.id === recordId) ?? config.records[0];

  if (!record) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-950">Record not found</h1>
        <Button asChild className="mt-4" size="sm">
          <Link href={backHref}>Back to {config.title}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-3">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {config.title}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">{record.title}</h1>
            <StatusBadge tone={record.statusTone}>{record.status}</StatusBadge>
            {record.secondaryStatus ? <StatusBadge tone={record.secondaryTone ?? "neutral"}>{record.secondaryStatus}</StatusBadge> : null}
          </div>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">{record.subtitle}</p>
        </div>
        <AdminDetailActions
          recordTitle={record.title}
          identifiers={config.safeIdentifiers.reduce<Record<string, string | number | null>>((payload, key) => {
            payload[key] = record.fields[key] ?? null;
            return payload;
          }, {})}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-border bg-white shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">{config.detailTitle}</h2>
            <p className="mt-1 text-xs text-slate-500">{config.detailDescription}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(record.fields).map(([key, value]) => (
              <div key={key} className="rounded-md border border-border bg-slate-50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{formatLabel(key)}</div>
                <div className="mt-1 break-words text-sm font-semibold text-slate-800">{String(value ?? "n/a")}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Safe identifiers</div>
            <div className="mt-3 space-y-2">
              {config.safeIdentifiers.map((key) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-bold text-slate-500">{formatLabel(key)}</span>
                  <span className="truncate font-mono text-slate-800">{String(record.fields[key] ?? "n/a")}</span>
                </div>
              ))}
            </div>
          </section>

          {record.sensitiveFields ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <ShieldCheck className="h-4 w-4" />
                Sensitive fields masked
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-800">The full values are intentionally unavailable on the server-rendered detail route. Reveal actions are audited from the workspace panel.</p>
              <div className="mt-3 space-y-2">
                {Object.keys(record.sensitiveFields).map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-md bg-white/70 px-3 py-2 text-xs">
                    <span className="font-bold text-amber-900">{key}</span>
                    <span className="font-mono text-amber-950">••••••••</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Timeline</h2>
          <div className="mt-3 space-y-2">
            {record.timeline.map((event) => (
              <div key={event} className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {event}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Internal notes and audit history</h2>
          <div className="mt-3 space-y-2">
            {record.notes.map((note) => (
              <div key={note} className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {note}
              </div>
            ))}
            <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-600">Detail route viewed. Persisted audit rows appear after audit logging is connected for this action.</div>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
