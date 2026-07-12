"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";

const rows = [
  ["IKD-10184", "Turkey 10 GB", "ayla@example.com", "Paid", "Fulfilled"],
  ["IKD-10183", "USA 20 GB", "john@example.com", "Paid", "Provisioning"],
  ["IKD-10182", "Europe 50 GB", "anna@example.com", "Failed", "Manual review"],
  ["IKD-10181", "Global Connect", "luc@example.com", "Paid", "Fulfilled"],
];

export function SimpleAdminPage({ title, description, action = "Create" }: { title: string; description: string; action?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [actionMenu, setActionMenu] = useState("");
  const [log, setLog] = useState("");
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !normalized || row.join(" ").toLowerCase().includes(normalized);
      const matchesStatus = status === "All" || row.includes(status);
      return matchesQuery && matchesStatus;
    });
  }, [query, status]);

  function exportRows() {
    const csv = visibleRows.map((row) => row.map((value) => `"${value}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLog(`Exported ${visibleRows.length} rows.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <Button size="sm" onClick={() => setLog(`${action} workflow opened.`)}>
          <Plus className="mr-2 h-4 w-4" />
          {action}
        </Button>
      </div>
      <section className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <input
            className="h-10 min-w-72 rounded-md border border-border px-3 text-sm outline-none ring-primary/20 focus:ring-4"
            placeholder="Search orders, customers, ICCID, PaymentIntent..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="h-7 rounded-md border border-border bg-white px-2.5 text-[0.8rem] font-medium text-slate-700 outline-none"
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              aria-label="Date range"
            >
              {["Today", "Last 7 days", "Last 30 days", "Last 90 days"].map((range) => <option key={range}>{range}</option>)}
            </select>
            <select
              className="h-7 rounded-md border border-border bg-white px-2.5 text-[0.8rem] font-medium text-slate-700 outline-none"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Status"
            >
              {["All", "Paid", "Failed", "Fulfilled", "Provisioning", "Manual review"].map((option) => <option key={option}>{option}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={exportRows}>Export</Button>
          </div>
        </div>
        {log ? <div className="border-b border-border bg-blue-50 px-4 py-2 text-xs font-medium text-primary">{dateRange} · {log}</div> : null}
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-border">
                <th className="py-2">Reference</th>
                <th className="py-2">Package</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Payment</th>
                <th className="py-2">State</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row[0]} className="border-b border-border/70 last:border-0">
                  <td className="py-3 font-mono text-xs font-bold text-primary">{row[0]}</td>
                  <td className="py-3 text-slate-700">{row[1]}</td>
                  <td className="py-3 text-slate-500">{row[2]}</td>
                  <td className="py-3"><StatusBadge tone={row[3] === "Failed" ? "error" : "success"}>{row[3]}</StatusBadge></td>
                  <td className="py-3"><StatusBadge tone={row[4] === "Manual review" ? "warning" : "info"}>{row[4]}</StatusBadge></td>
                  <td className="relative py-3 text-right">
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${row[0]}`} onClick={() => setActionMenu((current) => (current === row[0] ? "" : row[0]))}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {actionMenu === row[0] ? (
                      <div className="absolute right-0 top-10 z-10 w-44 rounded-lg border border-border bg-white p-2 text-left shadow-xl">
                        {["View details", "Copy reference", "Mark for review"].map((item) => (
                          <button
                            key={item}
                            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                            onClick={() => {
                              setLog(`${item} selected for ${row[0]}.`);
                              setActionMenu("");
                            }}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 ? <div className="rounded-lg border border-dashed border-border bg-slate-50 p-6 text-center text-sm text-slate-500">No rows match the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}
