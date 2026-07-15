export const adminDateRanges = ["Today", "Last 7 days", "Last 30 days", "Last 90 days", "Current month", "Previous month"] as const;

export type AdminDateRange = (typeof adminDateRanges)[number];

export const defaultAdminDateRange: AdminDateRange = "Last 30 days";

const rangeSlugs: Record<AdminDateRange, string> = {
  Today: "today",
  "Last 7 days": "last-7-days",
  "Last 30 days": "last-30-days",
  "Last 90 days": "last-90-days",
  "Current month": "current-month",
  "Previous month": "previous-month",
};

export function encodeAdminDateRange(range: string) {
  const normalized = normalizeAdminDateRange(range);
  return rangeSlugs[normalized];
}

export function normalizeAdminDateRange(value: unknown): AdminDateRange {
  if (typeof value !== "string") return defaultAdminDateRange;
  const direct = adminDateRanges.find((range) => range.toLowerCase() === value.trim().toLowerCase());
  if (direct) return direct;
  const fromSlug = Object.entries(rangeSlugs).find(([, slug]) => slug === value.trim().toLowerCase());
  return fromSlug ? fromSlug[0] as AdminDateRange : defaultAdminDateRange;
}

export function getAdminDateWindow(rangeInput: unknown, now = new Date()) {
  const range = normalizeAdminDateRange(rangeInput);
  const end = new Date(now);
  const start = new Date(now);

  if (range === "Today") {
    start.setHours(0, 0, 0, 0);
    return { range, start, end };
  }

  if (range === "Last 7 days") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { range, start, end };
  }

  if (range === "Last 30 days") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { range, start, end };
  }

  if (range === "Last 90 days") {
    start.setDate(start.getDate() - 89);
    start.setHours(0, 0, 0, 0);
    return { range, start, end };
  }

  if (range === "Current month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { range, start, end };
  }

  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { range, start: previousMonthStart, end: previousMonthEnd };
}

export function isDateInAdminRange(value: Date | number | string | null | undefined, rangeInput: unknown, now = new Date()) {
  const date = value instanceof Date ? value : value === null || value === undefined ? null : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return false;
  const { start, end } = getAdminDateWindow(rangeInput, now);
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export function setDateRangeSearchParam(params: URLSearchParams, range: string) {
  const next = new URLSearchParams(params);
  next.set("range", encodeAdminDateRange(range));
  next.delete("starting_after");
  return next;
}
