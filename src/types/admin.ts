export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export type KpiMetric = {
  label: string;
  value: string;
  previous: string;
  change: string;
  trend: "up" | "down";
  tooltip: string;
};

export type RecentOrder = {
  order: string;
  country: string;
  plan: string;
  customer: string;
  revenue: string;
  payment: string;
  status: StatusTone;
  date: string;
};

export type CountrySale = {
  country: string;
  code: string;
  sales: number;
  revenue: number;
};
