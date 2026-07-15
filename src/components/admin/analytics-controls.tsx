"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDateRanges, defaultAdminDateRange, normalizeAdminDateRange, setDateRangeSearchParam } from "@/lib/dates/admin-date-range";
import { showToast } from "@/lib/toastify";

export function AnalyticsControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateRange = normalizeAdminDateRange(searchParams.get("range"));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [country, setCountry] = useState("All countries");
  const [platform, setPlatform] = useState("All platforms");
  const updateDateRange = (value: string) => {
    const nextRange = normalizeAdminDateRange(value);
    router.push(`${pathname}?${setDateRangeSearchParam(searchParams, nextRange).toString()}`);
    router.refresh();
    showToast(`Analytics date range set to ${nextRange}.`, "info");
  };

  return (
    <div className="relative flex flex-wrap gap-2">
      <select
        className="h-7 rounded-md border border-border bg-white px-2.5 text-[0.8rem] font-medium text-slate-700 outline-none ring-primary/20 focus:ring-4"
        value={dateRange}
        onChange={(event) => updateDateRange(event.target.value)}
        aria-label="Analytics date range"
      >
        {adminDateRanges.map((range) => (
          <option key={range}>{range}</option>
        ))}
      </select>
      <Button variant="outline" size="sm" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
        <Filter className="mr-2 h-4 w-4" />
        Filters
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          router.push(`${pathname}?${setDateRangeSearchParam(searchParams, defaultAdminDateRange).toString()}`);
          router.refresh();
          setCountry("All countries");
          setPlatform("All platforms");
          setFiltersOpen(false);
          showToast("Analytics filters reset.", "success");
        }}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        Reset
      </Button>
      {filtersOpen ? (
        <div role="dialog" aria-label="Analytics filters" className="absolute right-0 top-9 z-20 grid w-80 gap-3 rounded-lg border border-border bg-white p-4 shadow-xl">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Date range
            <select
              className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none ring-primary/20 focus:ring-4"
              value={dateRange}
              onChange={(event) => updateDateRange(event.target.value)}
              onInput={(event) => updateDateRange(event.currentTarget.value)}
              aria-label="Analytics filter date range"
            >
              {adminDateRanges.map((range) => (
                <option key={range}>{range}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Country
            <select
              className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none ring-primary/20 focus:ring-4"
              value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  showToast(`Country filter set to ${event.target.value}.`, "info");
                }}
            >
              {["All countries", "Turkey", "United States", "Germany", "France", "UAE"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Platform
            <select
              className="h-9 rounded-md border border-border bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none ring-primary/20 focus:ring-4"
              value={platform}
                onChange={(event) => {
                  setPlatform(event.target.value);
                  showToast(`Platform filter set to ${event.target.value}.`, "info");
                }}
            >
              {["All platforms", "iOS", "Android", "Web"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <div className="rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-primary">
            Active: {dateRange} · {country} · {platform}
          </div>
        </div>
      ) : null}
    </div>
  );
}
