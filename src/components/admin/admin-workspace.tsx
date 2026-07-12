"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminRecord, AdminWorkspaceConfig } from "@/components/admin/operations-data";
import type { StatusTone } from "@/types/admin";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type Props = {
  config: AdminWorkspaceConfig;
  detailBasePath?: string;
  initialQuery?: string;
};

const dateRanges = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Current month", "Previous month", "Custom range"];

export function AdminWorkspace({ config, detailBasePath, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState(config.records[0]?.id ?? "");
  const [records, setRecords] = useState(config.records);
  const [actionLog, setActionLog] = useState<string[]>([
    config.modeLabel === "LIVE" ? "Live data loaded with redacted production controls." : "No live records loaded for this source.",
  ]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const searchable = [
        record.title,
        record.subtitle,
        record.status,
        record.secondaryStatus,
        record.category,
        ...Object.values(record.fields).map(String),
        ...Object.values(record.sensitiveFields ?? {}).map(maskForSearch),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery);
      const matchesFilters = config.filters.every((filter) => {
        const value = filterValues[filter.key];
        if (!value || value === "All") return true;
        if (filter.key === "status") return record.status === value || record.secondaryStatus === value || Object.values(record.fields).includes(value);
        return record.category === value || Object.values(record.fields).includes(value);
      });

      return matchesQuery && matchesFilters;
    });
  }, [config.filters, filterValues, query, records]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? records[0];

  function pushLog(message: string) {
    setActionLog((current) => [`${new Date().toLocaleTimeString()} - ${message}`, ...current].slice(0, 8));
  }

  function runAction(action: string, record: AdminRecord) {
    if (action.includes("Reveal")) {
      setRevealed((current) => ({ ...current, [record.id]: true }));
      pushLog(`Reveal audited for ${record.title}.`);
      showToast(`Reveal requested for ${record.title}.`, "warning");
      return;
    }

    if (action.includes("Retry") || action.includes("Replay") || action.includes("Synchronize") || action.includes("Reconcile")) {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? { ...item, secondaryStatus: "Queued", secondaryTone: "warning", notes: [`${action} queued for live processing.`, ...item.notes] }
            : item,
        ),
      );
      pushLog(`${action} queued for ${record.title}.`);
      showToast(`${action} queued for ${record.title}.`, "success");
      return;
    }

    if (action.includes("Refund")) {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? { ...item, status: "Refund review", statusTone: "warning", notes: ["Refund workflow requires finance approval.", ...item.notes] }
            : item,
        ),
      );
      pushLog(`Refund workflow opened for ${record.title}.`);
      showToast(`Refund workflow opened for ${record.title}.`, "warning");
      return;
    }

    if (action.includes("Disable")) {
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? { ...item, secondaryStatus: "Disable requested", secondaryTone: "warning", notes: ["Activation-data disable request recorded.", ...item.notes] }
            : item,
        ),
      );
      pushLog(`Activation data disabled for ${record.title}.`);
      showToast(`Disable request recorded for ${record.title}.`, "warning");
      return;
    }

    if (action.includes("Copy")) {
      const safePayload = config.safeIdentifiers.reduce<Record<string, string | number | null>>((payload, key) => {
        payload[key] = record.fields[key] ?? null;
        return payload;
      }, {});
      const writePromise = navigator.clipboard?.writeText(JSON.stringify(safePayload, null, 2));
      if (!writePromise) {
        pushLog(`Clipboard unavailable for ${record.title}.`);
        showToast("Clipboard is unavailable.", "error");
      } else {
        void writePromise.then(
          () => {
            pushLog(`Copied safe identifiers for ${record.title}.`);
            showToast("Safe identifiers copied.", "success");
          },
          () => {
            pushLog(`Clipboard permission denied for ${record.title}.`);
            showToast("Clipboard permission denied.", "error");
          },
        );
      }
      return;
    }

    pushLog(`${action} opened for ${record.title}.`);
    showToast(`${action} opened for ${record.title}.`, "info");
  }

  function addNote() {
    if (!selectedRecord || !note.trim()) return;
    const cleanNote = note.trim();
    setRecords((current) => current.map((record) => (record.id === selectedRecord.id ? { ...record, notes: [cleanNote, ...record.notes] } : record)));
    setNote("");
    pushLog(`Internal note added to ${selectedRecord.title}.`);
    showToast("Internal note added.", "success");
  }

  function markForReview(record: AdminRecord) {
    setRecords((current) =>
      current.map((item) =>
        item.id === record.id
          ? { ...item, secondaryStatus: "Manual review", secondaryTone: "warning", notes: ["Marked for manual review.", ...item.notes] }
          : item,
      ),
    );
    pushLog(`${record.title} marked for review.`);
    showToast(`${record.title} marked for review.`, "warning");
  }

  function exportCsv() {
    const headers = config.columns.map((column) => column.label);
    const rows = filteredRecords.map((record) =>
      config.columns.map((column) => {
        const rawValue = record.fields[column.key] ?? "";
        return `"${String(rawValue).replaceAll('"', '""')}"`;
      }),
    );
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.title.toLowerCase().replaceAll(" ", "-")}-export.csv`;
    link.click();
    URL.revokeObjectURL(url);
    pushLog(`Exported ${filteredRecords.length} visible rows.`);
    showToast(`Exported ${filteredRecords.length} rows.`, "success");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-950">{config.title}</h1>
            <StatusBadge tone={config.modeLabel === "LIVE" ? "success" : "neutral"}>{config.modeLabel ?? "LIVE EMPTY"}</StatusBadge>
          </div>
          <p className="mt-1 max-w-4xl text-sm text-slate-500">{config.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            showToast("Refreshing live page.", "info");
            window.location.reload();
          }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {config.pagination ? (
        <section className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-slate-950">{config.pagination.label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-600">{config.pagination.note}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.pagination.resetHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={config.pagination.resetHref}>Latest page</Link>
              </Button>
            ) : null}
            {config.pagination.nextHref ? (
              <Button asChild size="sm">
                <Link href={config.pagination.nextHref}>Next older page</Link>
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.summary.map((item) => (
          <article key={item.label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{item.value}</div>
              </div>
              <StatusBadge tone={item.tone ?? "neutral"}>{item.tone ?? "live"}</StatusBadge>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm outline-none ring-primary/20 transition focus:ring-4"
              placeholder={config.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-10 rounded-md border border-border bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-primary/20 focus:ring-4"
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              aria-label="Date range"
            >
              {dateRanges.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
            {config.filters.map((filter) => (
              <select
                key={filter.key}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm font-medium text-slate-700 outline-none ring-primary/20 focus:ring-4"
                value={filterValues[filter.key] ?? "All"}
                onChange={(event) => setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))}
                aria-label={filter.label}
              >
                <option>All</option>
                {filter.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setFilterValues({});
                setDateRange("Last 30 days");
                pushLog("Filters reset.");
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="grid min-h-[640px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden">
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-border">
                    {config.columns.map((column) => (
                      <th key={column.key} className={cn("py-2 font-bold", column.align === "right" && "text-right")}>
                        {column.label}
                      </th>
                    ))}
                    <th className="py-2 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className={cn(
                        "cursor-pointer border-b border-border/70 transition last:border-0 hover:bg-blue-50/40",
                        selectedRecord?.id === record.id && "bg-blue-50/60",
                      )}
                      onClick={() => setSelectedId(record.id)}
                    >
                      {config.columns.map((column) => (
                        <td key={column.key} className={cn("py-3 pr-4 align-middle", column.align === "right" && "text-right")}>
                          <Cell record={record} column={column} revealed={revealed[record.id]} />
                        </td>
                      ))}
                      <td className="relative py-3 text-right" onClick={(event) => event.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${record.title}`}
                          aria-expanded={actionMenuId === record.id}
                          onClick={() => setActionMenuId((current) => (current === record.id ? null : record.id))}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {actionMenuId === record.id ? (
                          <div className="absolute right-0 top-11 z-10 w-64 rounded-lg border border-border bg-white p-2 text-left shadow-xl">
                            {config.actions.slice(0, 8).map((action) => (
                              <button
                                key={action}
                                className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                                onClick={() => {
                                  runAction(action, record);
                                  setActionMenuId(null);
                                }}
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRecords.length === 0 ? (
                <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-slate-50 text-sm font-medium text-slate-500">
                  {config.emptyState}
                </div>
              ) : null}
            </div>
          </div>

          {selectedRecord ? (
            <aside className="border-t border-border bg-slate-50/70 p-4 xl:border-l xl:border-t-0">
              <div className="rounded-lg border border-border bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{config.detailTitle}</div>
                    <h2 className="mt-1 text-base font-bold text-slate-950">{selectedRecord.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{config.detailDescription}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Close detail panel" onClick={() => setSelectedId("")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={selectedRecord.statusTone}>{selectedRecord.status}</StatusBadge>
                    {selectedRecord.secondaryStatus ? <StatusBadge tone={selectedRecord.secondaryTone ?? "neutral"}>{selectedRecord.secondaryStatus}</StatusBadge> : null}
                    <StatusBadge tone="info">{dateRange}</StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {config.safeIdentifiers.map((key) => (
                      <div key={key} className="rounded-md border border-border bg-slate-50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{key}</div>
                        <div className="mt-1 truncate font-mono text-xs font-semibold text-slate-800">{String(selectedRecord.fields[key] ?? "n/a")}</div>
                      </div>
                    ))}
                  </div>

                  {selectedRecord.sensitiveFields ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                            <ShieldCheck className="h-4 w-4" />
                            Sensitive activation data
                          </div>
                          <p className="mt-1 text-xs leading-5 text-amber-800">Masked by default. Reveal is role-controlled and should be audited server-side.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runAction(revealed[selectedRecord.id] ? "Hide activation data" : "Reveal activation data", selectedRecord)}
                        >
                          {revealed[selectedRecord.id] ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                          {revealed[selectedRecord.id] ? "Hide" : "Reveal"}
                        </Button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {Object.entries(selectedRecord.sensitiveFields).map(([label, value]) => (
                          <div key={label} className="grid grid-cols-[110px_1fr] gap-3 text-xs">
                            <span className="font-bold text-amber-900">{label}</span>
                            <span className="break-all font-mono text-amber-950">{revealed[selectedRecord.id] ? value : maskSecret(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Fast actions</div>
                    <div className="grid grid-cols-1 gap-2">
                      {config.actions.slice(0, 5).map((action) => (
                        <Button key={action} variant="outline" size="sm" className="justify-start" onClick={() => runAction(action, selectedRecord)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                          {action}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" className="justify-start" onClick={() => markForReview(selectedRecord)}>
                        <FileText className="mr-2 h-4 w-4 text-amber-600" />
                        Mark for review
                      </Button>
                      {detailBasePath ? (
                        <Button asChild variant="outline" size="sm" className="justify-start">
                          <Link href={`${detailBasePath}/${selectedRecord.id}`}>Open full detail route</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Timeline</div>
                    <div className="space-y-2">
                      {selectedRecord.timeline.map((event) => (
                        <div key={event} className="rounded-md border border-border bg-white px-3 py-2 text-xs text-slate-600">
                          {event}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Internal notes</div>
                    <div className="space-y-2">
                      {selectedRecord.notes.map((item) => (
                        <div key={item} className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        className="h-9 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
                        placeholder="Add internal note..."
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addNote();
                        }}
                      />
                      <Button size="sm" onClick={addNote}>Add</Button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{config.operationsLogTitle ?? "Operations log"}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {config.operationsLogDescription ?? "Local UI action feedback. Persisted audit events appear when the backing table has records."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const writePromise = navigator.clipboard?.writeText(actionLog.join("\n"));
              if (!writePromise) {
                pushLog("Clipboard unavailable for operations log.");
                showToast("Clipboard is unavailable.", "error");
              } else {
                void writePromise.then(
                  () => {
                    pushLog("Copied operations log.");
                    showToast("Operations log copied.", "success");
                  },
                  () => {
                    pushLog("Clipboard permission denied for operations log.");
                    showToast("Clipboard permission denied.", "error");
                  },
                );
              }
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {actionLog.map((entry) => (
            <div key={entry} className="rounded-md border border-border bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {entry}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Cell({ record, column, revealed }: { record: AdminRecord; column: AdminWorkspaceConfig["columns"][number]; revealed?: boolean }) {
  const value = record.fields[column.key];
  const text = value === null || value === undefined ? "n/a" : String(value);

  if (column.kind === "status") {
    return <StatusBadge tone={toneForStatus(text, record)}>{text}</StatusBadge>;
  }

  if (column.kind === "mono") {
    return <span className="font-mono text-xs font-bold text-primary">{text}</span>;
  }

  if (column.kind === "masked") {
    return <span className="font-mono text-xs font-semibold text-slate-700">{revealed ? text : maskSecret(text)}</span>;
  }

  if (column.kind === "money" || column.kind === "number") {
    return <span className="font-semibold text-slate-800">{text}</span>;
  }

  if (column.kind === "date") {
    return <span className="text-slate-500">{text}</span>;
  }

  return <span className="text-slate-700">{text}</span>;
}

function toneForStatus(value: string, record: AdminRecord): StatusTone {
  if (value === record.status) return record.statusTone;
  if (value === record.secondaryStatus) return record.secondaryTone ?? "neutral";
  const normalized = value.toLowerCase();
  if (["paid", "succeeded", "processed", "matched", "active", "fulfilled", "enabled", "ready", "200"].includes(normalized)) return "success";
  if (["failed", "blocked", "disabled", "500"].includes(normalized)) return "error";
  if (["pending", "queued", "manual review", "review", "required", "400", "404", "429"].includes(normalized)) return "warning";
  if (["super_admin", "operations", "finance", "support", "developer"].includes(normalized)) return "info";
  return "neutral";
}

function maskSecret(value: string) {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

function maskForSearch(value: string) {
  return value.replace(/[^\s-]{5,}/g, (match) => `${match.slice(0, 4)}${match.slice(-4)}`);
}
