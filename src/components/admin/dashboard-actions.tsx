"use client";

import { useState } from "react";
import { CalendarDays, Check, Download, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";

const dateRanges = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Current month", "Previous month"];

export function DashboardActionBar() {
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [status, setStatus] = useState("All statuses");

  function exportDashboard() {
    const csv = [
      "metric,value",
      `"date_range","${dateRange}"`,
      `"status_filter","${status}"`,
      `"source","InternetKudo Admin dashboard"`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "internetkudo-dashboard-export.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Dashboard export downloaded.", "success");
  }

  return (
    <div className="relative flex flex-wrap gap-2">
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          aria-haspopup="menu"
          aria-expanded={dateOpen}
          onClick={() => {
            setDateOpen((open) => !open);
            setFiltersOpen(false);
          }}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {dateRange}
        </Button>
        {dateOpen ? (
          <div role="menu" className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-border bg-white p-2 shadow-xl">
            {dateRanges.map((range) => (
              <button
                key={range}
                role="menuitem"
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-primary"
                onClick={() => {
                  setDateRange(range);
                  setDateOpen(false);
                  showToast(`Date range set to ${range}.`, "info");
                }}
              >
                {range}
                {range === dateRange ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => {
            setFiltersOpen((open) => !open);
            setDateOpen(false);
          }}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
        {filtersOpen ? (
          <div role="dialog" aria-label="Dashboard filters" className="absolute right-0 top-9 z-20 w-72 rounded-lg border border-border bg-white p-4 shadow-xl">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500" htmlFor="dashboard-status-filter">
              Payment status
            </label>
            <select
              id="dashboard-status-filter"
              className="mt-2 h-9 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                showToast(`Payment status filter set to ${event.target.value}.`, "info");
              }}
            >
              {["All statuses", "Succeeded", "Failed", "Refunded", "Manual review"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-primary">
              Active: {dateRange} · {status}
            </div>
          </div>
        ) : null}
      </div>

      <Button size="sm" onClick={exportDashboard}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
    </div>
  );
}

export function DashboardChartToggle({ values }: { values: string[] }) {
  const [index, setIndex] = useState(0);
  const value = values[index] ?? values[0] ?? "View";

  return (
    <button
      className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-blue-50"
      onClick={() => {
        setIndex((current) => {
          const next = (current + 1) % values.length;
          showToast(`Chart view set to ${values[next]}.`, "info");
          return next;
        });
      }}
    >
      {value}
    </button>
  );
}

export function DashboardRefreshButton() {
  const [refreshedAt, setRefreshedAt] = useState("Ready");

  return (
    <button
      className="flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
      onClick={() => {
        setRefreshedAt(new Date().toLocaleTimeString());
        showToast("Webhook health refreshed.", "success");
      }}
      aria-label="Refresh webhook health"
    >
      <RefreshCw className="h-4 w-4 text-slate-400" />
      {refreshedAt}
    </button>
  );
}
