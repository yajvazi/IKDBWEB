import type { CountrySale, KpiMetric, RecentOrder } from "@/types/admin";

export const dashboardKpis: KpiMetric[] = [
  { label: "Gross revenue", value: "€248,790.50", previous: "€221,408.21", change: "+12.4%", trend: "up", tooltip: "Total order revenue before reseller cost, Stripe fees, refunds, and tax adjustments." },
  { label: "Net revenue", value: "€214,118.40", previous: "€198,344.18", change: "+8.0%", trend: "up", tooltip: "Gross revenue minus refunds and direct payment fees." },
  { label: "Packages sold", value: "12,456", previous: "11,824", change: "+5.3%", trend: "up", tooltip: "Completed order item quantity for sellable InternetKudo packages." },
  { label: "Successful payments", value: "8,932", previous: "8,121", change: "+10.0%", trend: "up", tooltip: "Stripe PaymentIntents with succeeded status in the selected period." },
  { label: "Failed payments", value: "341", previous: "298", change: "+14.4%", trend: "down", tooltip: "Payment attempts that failed, were canceled, or required a new checkout." },
  { label: "Refunds", value: "€2,354.20", previous: "€1,941.80", change: "+21.2%", trend: "down", tooltip: "Refunded amount confirmed by Stripe webhook events." },
  { label: "Active eSIMs", value: "8,392", previous: "7,884", change: "+6.4%", trend: "up", tooltip: "eSIM records currently active or within package validity." },
  { label: "Activated eSIMs", value: "7,821", previous: "7,390", change: "+5.8%", trend: "up", tooltip: "Provisioned eSIMs with a known activation timestamp." },
  { label: "Unactivated eSIMs", value: "571", previous: "494", change: "+15.6%", trend: "down", tooltip: "Provisioned eSIMs without an activation timestamp." },
  { label: "Average order value", value: "€19.97", previous: "€18.94", change: "+5.4%", trend: "up", tooltip: "Gross order revenue divided by successful orders." },
  { label: "Conversion rate", value: "3.42%", previous: "3.30%", change: "+0.12pp", trend: "up", tooltip: "Successful purchases divided by checkout starts." },
  { label: "Gross margin", value: "42.8%", previous: "41.1%", change: "+1.7pp", trend: "up", tooltip: "Gross profit divided by gross revenue after reseller cost snapshots." },
];

export const revenueSeries = [
  { date: "May 01", revenue: 6200, cost: 3300, profit: 2900, packages: 320 },
  { date: "May 04", revenue: 12400, cost: 6200, profit: 6200, packages: 515 },
  { date: "May 07", revenue: 9800, cost: 5000, profit: 4800, packages: 421 },
  { date: "May 10", revenue: 14300, cost: 6900, profit: 7400, packages: 604 },
  { date: "May 13", revenue: 13100, cost: 6700, profit: 6400, packages: 532 },
  { date: "May 16", revenue: 16900, cost: 8200, profit: 8700, packages: 690 },
  { date: "May 19", revenue: 17800, cost: 8500, profit: 9300, packages: 742 },
  { date: "May 22", revenue: 15100, cost: 7600, profit: 7500, packages: 611 },
  { date: "May 25", revenue: 18400, cost: 8900, profit: 9500, packages: 788 },
  { date: "May 28", revenue: 20100, cost: 9500, profit: 10600, packages: 814 },
  { date: "May 31", revenue: 21300, cost: 10100, profit: 11200, packages: 862 },
];

export const countrySales: CountrySale[] = [
  { country: "Turkey", code: "TR", sales: 2848, revenue: 46800 },
  { country: "United States", code: "US", sales: 2104, revenue: 39400 },
  { country: "Germany", code: "DE", sales: 1598, revenue: 31800 },
  { country: "United Kingdom", code: "GB", sales: 1284, revenue: 25500 },
  { country: "France", code: "FR", sales: 834, revenue: 18300 },
  { country: "UAE", code: "AE", sales: 724, revenue: 16900 },
  { country: "Japan", code: "JP", sales: 618, revenue: 14300 },
  { country: "Brazil", code: "BR", sales: 512, revenue: 12600 },
];

export const packageSales = [
  { name: "Global Connect", sales: 3421, revenue: 68352 },
  { name: "Turkey 10 GB", sales: 1492, revenue: 28348 },
  { name: "USA 20 GB", sales: 1288, revenue: 38627 },
  { name: "Europe 50 GB", sales: 1181, revenue: 58919 },
  { name: "UAE 5 GB", sales: 1034, revenue: 20669 },
];

export const paymentStatus = [
  { name: "Paid", value: 8932, fill: "#16A34A" },
  { name: "Pending", value: 428, fill: "#F59E0B" },
  { name: "Failed", value: 341, fill: "#DC2626" },
];

export const customerMix = [
  { name: "New", value: 64, fill: "#004FFE" },
  { name: "Returning", value: 36, fill: "#6EF825" },
];

export const recentOrders: RecentOrder[] = [
  { order: "#IKD-10184", country: "Turkey", plan: "10 GB - 30 Days", customer: "ayla@example.com", revenue: "€18.99", payment: "Paid", status: "success", date: "May 31, 10:44" },
  { order: "#IKD-10183", country: "USA", plan: "20 GB - 30 Days", customer: "john@example.com", revenue: "€34.99", payment: "Paid", status: "success", date: "May 31, 10:16" },
  { order: "#IKD-10182", country: "Germany", plan: "10 GB - 30 Days", customer: "anna@example.com", revenue: "€24.99", payment: "Paid", status: "success", date: "May 31, 09:58" },
  { order: "#IKD-10181", country: "France", plan: "5 GB - 15 Days", customer: "luc@example.com", revenue: "€14.99", payment: "Failed", status: "error", date: "May 31, 09:43" },
  { order: "#IKD-10180", country: "UAE", plan: "10 GB - 30 Days", customer: "nora@example.com", revenue: "€29.99", payment: "Paid", status: "success", date: "May 31, 09:21" },
];

export const proxyActivity = [
  { timestamp: "May 31, 11:02", requestId: "req_8fd01c", endpoint: "/api/v1/esims/esim_102/usage", command: "listSubscriberPrepaidPackages", method: "POST", result: "OK", ocs: 0, http: 200, duration: "132 ms", retries: 0, env: "MOCK" },
  { timestamp: "May 31, 10:58", requestId: "req_6ad81a", endpoint: "/api/v1/orders", command: "provision.placeholder", method: "POST", result: "Queued", ocs: null, http: 202, duration: "48 ms", retries: 0, env: "MOCK" },
  { timestamp: "May 31, 10:51", requestId: "req_6ac21d", endpoint: "/api/v1/esims/search", command: "listSubscriberPrepaidPackages", method: "POST", result: "DB_NOT_FOUND", ocs: 6, http: 404, duration: "211 ms", retries: 1, env: "MOCK" },
];
