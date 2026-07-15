import type { AdminRecord, AdminWorkspaceConfig } from "@/components/admin/operations-data";
import { customersConfig, ordersConfig, paymentsConfig } from "@/components/admin/operations-data";
import type { KpiMetric, StatusTone } from "@/types/admin";
import { getCachedCharges, getCachedCustomers, getCachedPaymentIntents, getLatestStripeBalanceSummary, getStripeCacheStatus } from "@/server/stripe/cache";
import type Stripe from "stripe";

const eur = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });
const stripePageLimit = 100;

type StripeCursorOptions = {
  startingAfter?: string;
};

const dashboardKpiTemplates: KpiMetric[] = [
  { label: "Gross revenue", value: "€0.00", previous: "All Stripe history", change: "live", trend: "up", tooltip: "Total Stripe PaymentIntent amount_received for succeeded payments." },
  { label: "Net revenue", value: "€0.00", previous: "All Stripe history", change: "live", trend: "up", tooltip: "Gross Stripe revenue minus refunded charge amount." },
  { label: "Packages sold", value: "0", previous: "Stripe metadata quantity", change: "live", trend: "up", tooltip: "Sum of quantity metadata on successful Stripe PaymentIntents, defaulting to one per payment." },
  { label: "Successful payments", value: "0", previous: "All Stripe history", change: "live", trend: "up", tooltip: "Stripe PaymentIntents with succeeded status." },
  { label: "Failed payments", value: "0", previous: "All Stripe history", change: "live", trend: "up", tooltip: "Stripe PaymentIntents that failed or were canceled." },
  { label: "Refunds", value: "€0.00", previous: "All Stripe charges", change: "live", trend: "up", tooltip: "Refunded amount from Stripe Charges." },
  { label: "Active eSIMs", value: "0", previous: "Awaiting eSIM table", change: "live", trend: "up", tooltip: "Live eSIM count requires persisted eSIM ownership records." },
  { label: "Activated eSIMs", value: "0", previous: "Awaiting eSIM table", change: "live", trend: "up", tooltip: "Live activation count requires persisted eSIM activation records." },
  { label: "Unactivated eSIMs", value: "0", previous: "Awaiting eSIM table", change: "live", trend: "up", tooltip: "Live unactivated count requires persisted eSIM records." },
  { label: "Average order value", value: "€0.00", previous: "All Stripe history", change: "live", trend: "up", tooltip: "Gross Stripe revenue divided by successful payments." },
  { label: "Conversion rate", value: "0%", previous: "Awaiting analytics events", change: "live", trend: "up", tooltip: "Requires app analytics events." },
  { label: "Gross margin", value: "0%", previous: "Awaiting OCS cost snapshots", change: "live", trend: "up", tooltip: "Requires reseller cost snapshots." },
];

export async function getPaymentsWorkspaceConfig(options: StripeCursorOptions = {}): Promise<AdminWorkspaceConfig> {
  try {
    const [allPaymentIntents, cacheStatus] = await Promise.all([
      getCachedPaymentIntents({ sync: true }),
      getStripeCacheStatus(),
    ]);
    const balance = await getLatestStripeBalanceSummary();
    const page = paginateByStartingAfter(allPaymentIntents, options.startingAfter);
    const records = page.data.map(paymentIntentToRecord);

    if (records.length === 0) return emptyLiveConfig(paymentsConfig, "No live Stripe payments found.");

    const succeeded = allPaymentIntents.filter((payment) => payment.status === "succeeded").length;
    const failed = allPaymentIntents.filter((payment) => payment.status === "requires_payment_method" || payment.status === "canceled").length;
    const grossMinor = allPaymentIntents.reduce((sum, payment) => sum + (payment.status === "succeeded" ? payment.amount_received : 0), 0);

    return {
      ...paymentsConfig,
      modeLabel: "LIVE",
      operationsLogTitle: "Cached Stripe operations log",
      operationsLogDescription: "Payment rows are read from Supabase and incrementally synced from Stripe on page reload.",
      description: "Stripe PaymentIntents cached in Supabase/Postgres. Each page reload syncs new Stripe records, then renders from the database for shorter load times.",
      summary: [
        { label: "Visible cached page", value: records.length.toLocaleString(), tone: "info" },
        { label: "Cached payments", value: cacheStatus.paymentIntents.toLocaleString(), tone: "info" },
        { label: "All gross sales", value: formatMinor(grossMinor), tone: "success" },
        { label: "Succeeded", value: succeeded.toLocaleString(), tone: "success" },
        { label: "Failed", value: failed.toLocaleString(), tone: failed > 0 ? "warning" : "success" },
        { label: "Stripe available", value: formatBalanceAmounts(balance?.available), tone: "success" },
        { label: "Stripe pending", value: formatBalanceAmounts(balance?.pending), tone: "warning" },
        { label: "Last sync", value: formatSyncTime(cacheStatus.lastSyncedAt), tone: "neutral" },
      ],
      records,
      pagination: {
        label: "Cached Stripe history",
        note: page.has_more
          ? "Showing one Supabase cached page. Use Next older page to continue through cached PaymentIntent history."
          : "You are at the oldest cached PaymentIntent page.",
        nextHref: page.has_more && records.at(-1) ? `/admin/payments?starting_after=${encodeURIComponent(records.at(-1)!.id)}` : undefined,
        resetHref: options.startingAfter ? "/admin/payments" : undefined,
      },
    };
  } catch (error) {
    console.warn("Stripe payment fetch failed; returning an empty live payment page.", safeError(error));
    return emptyLiveConfig(paymentsConfig, "Stripe payments could not be loaded.");
  }
}

export async function getStripeOrdersWorkspaceConfig(options: StripeCursorOptions = {}): Promise<AdminWorkspaceConfig> {
  const [allPaymentIntents, cacheStatus] = await Promise.all([
    getCachedPaymentIntents({ sync: true }),
    getStripeCacheStatus(),
  ]);
  const page = paginateByStartingAfter(allPaymentIntents, options.startingAfter);
  const records = page.data.map(paymentIntentToOrderRecord);
  const succeeded = allPaymentIntents.filter((payment) => payment.status === "succeeded");
  const failed = allPaymentIntents.filter((payment) => payment.status === "requires_payment_method" || payment.status === "canceled");
  const processing = allPaymentIntents.filter((payment) => ["processing", "requires_action", "requires_confirmation"].includes(payment.status));
  const grossMinor = succeeded.reduce((sum, payment) => sum + payment.amount_received, 0);

  return {
    ...ordersConfig,
    modeLabel: "LIVE",
    primaryAction: "Create order",
    operationsLogTitle: "Cached Stripe order feed",
    operationsLogDescription: "Rows are derived from Supabase-cached Stripe PaymentIntents until local InternetKudo order persistence is populated.",
    description: "Order view derived from cached Stripe PaymentIntents. Each reload syncs newly created Stripe records, then renders from Postgres.",
    summary: [
      { label: "Visible cached orders", value: records.length.toLocaleString(), tone: "info" },
      { label: "Cached Stripe orders", value: cacheStatus.paymentIntents.toLocaleString(), tone: "info" },
      { label: "Paid", value: succeeded.length.toLocaleString(), tone: "success" },
      { label: "Failed", value: failed.length.toLocaleString(), tone: failed.length > 0 ? "warning" : "success" },
      { label: "Processing", value: processing.length.toLocaleString(), tone: processing.length > 0 ? "warning" : "neutral" },
      { label: "Gross sales", value: formatMinor(grossMinor), tone: "success" },
      { label: "Last sync", value: formatSyncTime(cacheStatus.lastSyncedAt), tone: "neutral" },
    ],
    records,
    emptyState: "No Stripe PaymentIntents found for the connected account.",
    pagination: {
      label: "Cached Stripe order history",
      note: page.has_more
        ? "Showing one cached page. Use Next older page to continue through cached PaymentIntent history."
        : "You are at the oldest cached PaymentIntent page.",
      nextHref: page.has_more && records.at(-1) ? `/admin/orders?starting_after=${encodeURIComponent(records.at(-1)!.id)}` : undefined,
      resetHref: options.startingAfter ? "/admin/orders" : undefined,
    },
  };
}

export async function getCustomersWorkspaceConfig(options: StripeCursorOptions = {}): Promise<AdminWorkspaceConfig> {
  try {
    const [allCustomers, cacheStatus] = await Promise.all([
      getCachedCustomers({ sync: true }),
      getStripeCacheStatus(),
    ]);
    const page = paginateByStartingAfter(allCustomers, options.startingAfter);
    const records = page.data.map(customerToRecord);

    if (records.length === 0) return emptyLiveConfig(customersConfig, "No live Stripe customers found.");

    const withEmail = records.filter((record) => record.fields.email !== "n/a").length;

    return {
      ...customersConfig,
      modeLabel: "LIVE",
      operationsLogTitle: "Cached Stripe operations log",
      operationsLogDescription: "Customer rows are read from Supabase and incrementally synced from Stripe on page reload.",
      description: "Stripe customer records cached in Supabase/Postgres. Each page reload syncs new Stripe customers, then renders from the database for shorter load times.",
      summary: [
        { label: "Visible cached page", value: records.length.toLocaleString(), tone: "info" },
        { label: "Cached customers", value: cacheStatus.customers.toLocaleString(), tone: "info" },
        { label: "With email", value: withEmail.toLocaleString(), tone: "success" },
        { label: "Delinquent", value: "0", tone: "success" },
        { label: "Source", value: "Supabase cache", tone: "neutral" },
        { label: "Last sync", value: formatSyncTime(cacheStatus.lastSyncedAt), tone: "neutral" },
      ],
      records,
      pagination: {
        label: "Cached Stripe history",
        note: page.has_more
          ? "Showing one cached page. Use Next older page to continue through cached Customer history."
          : "You are at the oldest cached Customer page.",
        nextHref: page.has_more && records.at(-1) ? `/admin/customers?starting_after=${encodeURIComponent(records.at(-1)!.id)}` : undefined,
        resetHref: options.startingAfter ? "/admin/customers" : undefined,
      },
    };
  } catch (error) {
    console.warn("Stripe customer fetch failed; returning an empty live customer page.", safeError(error));
    return emptyLiveConfig(customersConfig, "Stripe customers could not be loaded.");
  }
}

export async function getDashboardKpis(): Promise<KpiMetric[]> {
  try {
    const [paymentIntents, charges] = await Promise.all([
      getCachedPaymentIntents({ sync: true }),
      getCachedCharges({ sync: true }),
    ]);

    const succeeded = paymentIntents.filter((payment) => payment.status === "succeeded");
    const failed = paymentIntents.filter((payment) => payment.status === "requires_payment_method" || payment.status === "canceled");
    const grossMinor = succeeded.reduce((sum, payment) => sum + payment.amount_received, 0);
    const refundedMinor = charges.reduce((sum, charge) => sum + (charge.amount_refunded ?? 0), 0);
    const netMinor = Math.max(grossMinor - refundedMinor, 0);
    const aovMinor = succeeded.length > 0 ? Math.round(grossMinor / succeeded.length) : 0;

    const packagesSold = succeeded.reduce((sum, payment) => sum + Number(payment.metadata?.quantity ?? 1), 0);

    return dashboardKpiTemplates.map((metric) => {
      if (metric.label === "Gross revenue") return { ...metric, value: formatMinor(grossMinor), previous: "All Stripe history", change: "live", trend: "up" };
      if (metric.label === "Net revenue") return { ...metric, value: formatMinor(netMinor), previous: "All Stripe history", change: "live", trend: "up" };
      if (metric.label === "Packages sold") return { ...metric, value: packagesSold.toLocaleString(), previous: "Stripe metadata", change: "live", trend: "up" };
      if (metric.label === "Successful payments") return { ...metric, value: succeeded.length.toLocaleString(), previous: "All Stripe history", change: "live", trend: "up" };
      if (metric.label === "Failed payments") return { ...metric, value: failed.length.toLocaleString(), previous: "All Stripe history", change: "live", trend: failed.length > 0 ? "down" : "up" };
      if (metric.label === "Refunds") return { ...metric, value: formatMinor(refundedMinor), previous: "All Stripe history", change: "live", trend: refundedMinor > 0 ? "down" : "up" };
      if (metric.label === "Average order value") return { ...metric, value: formatMinor(aovMinor), previous: "All Stripe history", change: "live", trend: "up" };
      return metric;
    });
  } catch (error) {
    console.warn("Stripe dashboard KPI fetch failed; returning zeroed live KPI records.", safeError(error));
    return zeroDashboardKpis();
  }
}

export async function getDashboardAnalytics() {
  let paymentIntents: Stripe.PaymentIntent[] = [];
  let charges: Stripe.Charge[] = [];
  try {
    [paymentIntents, charges] = await Promise.all([
      getCachedPaymentIntents({ sync: true }),
      getCachedCharges({ sync: true }),
    ]);
  } catch (error) {
    console.warn("Stripe dashboard analytics fetch failed; returning empty live analytics.", safeError(error));
  }
  const succeeded = paymentIntents.filter((payment) => payment.status === "succeeded");
  const revenueByDate = new Map<string, { date: string; revenue: number; cost: number; profit: number; packages: number }>();
  const countryMap = new Map<string, { country: string; code: string; sales: number; revenue: number }>();
  const packageMap = new Map<string, { name: string; sales: number; revenue: number }>();
  const customerCounts = new Map<string, number>();

  for (const payment of succeeded) {
    const date = new Date(payment.created * 1000).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    const existingDate = revenueByDate.get(date) ?? { date, revenue: 0, cost: 0, profit: 0, packages: 0 };
    existingDate.revenue += payment.amount_received / 100;
    existingDate.profit += payment.amount_received / 100;
    existingDate.packages += Number(payment.metadata?.quantity ?? 1);
    revenueByDate.set(date, existingDate);

    const country = payment.metadata?.country || payment.metadata?.countryCode || "Unknown";
    const code = (payment.metadata?.countryCode || country.slice(0, 2)).toUpperCase();
    const existingCountry = countryMap.get(country) ?? { country, code, sales: 0, revenue: 0 };
    existingCountry.sales += 1;
    existingCountry.revenue += payment.amount_received / 100;
    countryMap.set(country, existingCountry);

    const packageName = payment.metadata?.packageName || payment.metadata?.planName || payment.description || "Unlabeled Stripe payment";
    const existingPackage = packageMap.get(packageName) ?? { name: packageName, sales: 0, revenue: 0 };
    existingPackage.sales += 1;
    existingPackage.revenue += payment.amount_received / 100;
    packageMap.set(packageName, existingPackage);

    const customerKey = typeof payment.customer === "string" ? payment.customer : payment.receipt_email || payment.metadata?.email || payment.id;
    customerCounts.set(customerKey, (customerCounts.get(customerKey) ?? 0) + 1);
  }

  const returning = Array.from(customerCounts.values()).filter((count) => count > 1).length;
  const newCustomers = Math.max(customerCounts.size - returning, 0);
  const paid = paymentIntents.filter((payment) => payment.status === "succeeded").length;
  const pending = paymentIntents.filter((payment) => ["processing", "requires_action", "requires_confirmation"].includes(payment.status)).length;
  const failed = paymentIntents.filter((payment) => payment.status === "requires_payment_method" || payment.status === "canceled").length;

  return {
    revenueSeries: Array.from(revenueByDate.values()).slice(-14),
    countrySales: Array.from(countryMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 8),
    packageSales: Array.from(packageMap.values()).sort((a, b) => b.sales - a.sales).slice(0, 8),
    paymentStatus: [
      { name: "Paid", value: paid, fill: "#16A34A" },
      { name: "Pending", value: pending, fill: "#F59E0B" },
      { name: "Failed", value: failed, fill: "#DC2626" },
    ],
    customerMix: [
      { name: "New", value: newCustomers, fill: "#004FFE" },
      { name: "Returning", value: returning, fill: "#6EF825" },
    ],
    recentOrders: paymentIntents.slice(0, 5).map((payment) => ({
      order: payment.metadata?.orderNumber || payment.metadata?.orderId || payment.id,
      country: payment.metadata?.country || payment.metadata?.countryCode || "n/a",
      plan: payment.metadata?.packageName || payment.metadata?.planName || payment.description || "Stripe payment",
      customer: payment.receipt_email || payment.metadata?.email || String(payment.customer ?? "n/a"),
      revenue: formatMinor(payment.amount, payment.currency),
      payment: normalizeOrderStatus(payment.status).label,
      status: normalizeOrderStatus(payment.status).tone,
      date: new Date(payment.created * 1000).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    })),
    refundMinor: charges.reduce((sum, charge) => sum + (charge.amount_refunded ?? 0), 0),
  };
}

function paymentIntentToRecord(paymentIntent: Stripe.PaymentIntent): AdminRecord {
  const charge = typeof paymentIntent.latest_charge === "object" && paymentIntent.latest_charge ? paymentIntent.latest_charge : null;
  const status = normalizePaymentStatus(paymentIntent.status);
  const createdAt = new Date(paymentIntent.created * 1000);
  const method = charge?.payment_method_details?.type ?? paymentIntent.payment_method_types?.[0] ?? "n/a";
  const refundAmount = charge?.amount_refunded ? formatMinor(charge.amount_refunded, charge.currency) : "€0.00";

  return {
    id: paymentIntent.id,
    title: paymentIntent.id,
    subtitle: `${formatMinor(paymentIntent.amount, paymentIntent.currency)} - ${status.label}`,
    createdAt: createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    amount: formatMinor(paymentIntent.amount, paymentIntent.currency),
    status: status.label,
    statusTone: status.tone,
    category: normalizeMethod(method),
    fields: {
      paymentIntent: paymentIntent.id,
      order: paymentIntent.metadata?.orderId ?? "not linked",
      customer: typeof paymentIntent.customer === "string" ? paymentIntent.customer : "n/a",
      amount: formatMinor(paymentIntent.amount, paymentIntent.currency),
      currency: paymentIntent.currency.toUpperCase(),
      method: normalizeMethod(method),
      stripeFee: "pending balance transaction",
      refundAmount,
      webhook: "Configured",
      reconciliation: paymentIntent.metadata?.orderId ? "Linked" : "Unlinked",
      createdDate: createdAt.toISOString(),
      status: paymentIntent.status,
      chargeId: charge?.id ?? "n/a",
    },
    timeline: ["Loaded from Stripe PaymentIntents", "Webhook endpoint configured", "Local order reconciliation pending"],
    notes: ["Live Stripe record. Order linkage depends on metadata.orderId created by the checkout API."],
  };
}

function paymentIntentToOrderRecord(paymentIntent: Stripe.PaymentIntent): AdminRecord {
  const charge = typeof paymentIntent.latest_charge === "object" && paymentIntent.latest_charge ? paymentIntent.latest_charge : null;
  const customer = typeof paymentIntent.customer === "object" && paymentIntent.customer ? paymentIntent.customer as Stripe.Customer : null;
  const orderStatus = normalizeOrderStatus(paymentIntent.status);
  const createdAt = new Date(paymentIntent.created * 1000);
  const orderNumber = paymentIntent.metadata?.orderNumber || paymentIntent.metadata?.orderId || paymentIntent.id;
  const customerName = customer?.name || paymentIntent.metadata?.customerName || customer?.email || "Stripe customer";
  const email = customer?.email || paymentIntent.receipt_email || paymentIntent.metadata?.email || "n/a";
  const packageName = paymentIntent.metadata?.packageName || paymentIntent.metadata?.planName || paymentIntent.description || "Stripe checkout";

  return {
    id: paymentIntent.metadata?.orderId || paymentIntent.id,
    title: orderNumber,
    subtitle: `${packageName} - ${customerName}`,
    createdAt: createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    amount: formatMinor(paymentIntent.amount, paymentIntent.currency),
    status: orderStatus.label,
    statusTone: orderStatus.tone,
    secondaryStatus: paymentIntent.status === "succeeded" ? "Payment confirmed" : "Awaiting payment",
    secondaryTone: paymentIntent.status === "succeeded" ? "success" : "warning",
    category: paymentIntent.metadata?.country || paymentIntent.metadata?.countryCode || "Stripe",
    fields: {
      orderNumber,
      purchaseDate: createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      customer: customerName,
      email,
      country: paymentIntent.metadata?.country || paymentIntent.metadata?.countryCode || "n/a",
      package: packageName,
      dataAllowance: paymentIntent.metadata?.dataAllowance || "n/a",
      validity: paymentIntent.metadata?.validity || "n/a",
      quantity: paymentIntent.metadata?.quantity || "1",
      salePrice: formatMinor(paymentIntent.amount, paymentIntent.currency),
      resellerCost: "pending OCS order linkage",
      stripeFee: "pending balance transaction",
      grossMargin: "pending",
      paymentStatus: orderStatus.label,
      fulfillmentStatus: paymentIntent.metadata?.provisioningStatus || (paymentIntent.status === "succeeded" ? "Pending provisioning" : "Not started"),
      esimStatus: paymentIntent.metadata?.esimStatus || "n/a",
      paymentIntent: paymentIntent.id,
      chargeId: charge?.id ?? "n/a",
      ocsRequest: paymentIntent.metadata?.ocsRequestId || "pending",
    },
    timeline: [
      "Loaded from Stripe PaymentIntents",
      paymentIntent.status === "succeeded" ? "Payment succeeded in Stripe" : `Stripe status: ${paymentIntent.status}`,
      "Waiting for local order/provisioning linkage when available",
    ],
    notes: ["Live Stripe-derived order row. InternetKudo order fields depend on checkout metadata and Postgres order persistence."],
  };
}

function customerToRecord(customer: Stripe.Customer): AdminRecord {
  const createdAt = new Date(customer.created * 1000);
  const name = customer.name ?? customer.email ?? customer.id;

  return {
    id: customer.id,
    title: name,
    subtitle: customer.email ?? customer.id,
    createdAt: createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    amount: "pending orders",
    status: "Stripe",
    statusTone: "info",
    category: "Stripe",
    fields: {
      customerId: customer.id,
      name,
      email: customer.email ?? "n/a",
      registrationDate: createdAt.toLocaleDateString("en-US"),
      orders: "pending Supabase orders",
      successfulOrders: "pending",
      failedOrders: "pending",
      totalRevenue: "pending",
      aov: "pending",
      activeEsims: "pending",
      lastPurchase: "pending",
      risk: customer.delinquent ? "Delinquent" : "Low",
      lastOrder: "pending",
    },
    timeline: ["Loaded from Stripe Customers", "Awaiting Supabase order history", "Awaiting eSIM ownership records"],
    notes: ["Live Stripe customer. InternetKudo profile enrichment requires Supabase customer/order tables."],
  };
}

function normalizePaymentStatus(status: string): { label: string; tone: StatusTone } {
  if (status === "succeeded") return { label: "Succeeded", tone: "success" };
  if (status === "canceled" || status === "requires_payment_method") return { label: "Failed", tone: "error" };
  if (status === "processing" || status === "requires_action" || status === "requires_confirmation") return { label: "Processing", tone: "warning" };
  return { label: status, tone: "neutral" };
}

function normalizeOrderStatus(status: string): { label: string; tone: StatusTone } {
  if (status === "succeeded") return { label: "Paid", tone: "success" };
  if (status === "canceled" || status === "requires_payment_method") return { label: "Failed", tone: "error" };
  if (status === "processing" || status === "requires_action" || status === "requires_confirmation") return { label: "Pending", tone: "warning" };
  return { label: status, tone: "neutral" };
}

function normalizeMethod(method: string) {
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMinor(amount: number, currency = "eur") {
  if (currency.toLowerCase() === "eur") return eur.format(amount / 100);
  return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
}

function safeError(error: unknown) {
  return error instanceof Error ? { message: error.message } : { message: "Unknown error" };
}

function emptyLiveConfig(config: AdminWorkspaceConfig, emptyState: string): AdminWorkspaceConfig {
  return {
    ...config,
    modeLabel: "LIVE",
    summary: [
      { label: "Live records", value: "0", tone: "neutral" },
      { label: "Source", value: "Live backend", tone: "info" },
      { label: "Fallback rows", value: "0", tone: "success" },
      { label: "Status", value: "Empty", tone: "neutral" },
    ],
    records: [],
    emptyState,
  };
}

function zeroDashboardKpis(): KpiMetric[] {
  return dashboardKpiTemplates.map((metric) => ({
    ...metric,
    value: metric.value.startsWith("€") ? "€0.00" : "0",
    previous: "Live source unavailable",
    change: "0",
    trend: "up",
  }));
}

function paginateByStartingAfter<T extends { id: string }>(items: T[], startingAfter?: string) {
  const startIndex = startingAfter ? items.findIndex((item) => item.id === startingAfter) + 1 : 0;
  const safeStart = startIndex > 0 ? startIndex : 0;
  const data = items.slice(safeStart, safeStart + stripePageLimit);
  return {
    data,
    has_more: safeStart + stripePageLimit < items.length,
  };
}

function formatSyncTime(value: string | null) {
  if (!value) return "Not synced";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatBalanceAmounts(values?: Array<{ amount: number; currency: string }>) {
  if (!values?.length) return "€0.00";
  return values.map((item) => formatMinor(item.amount, item.currency)).join(", ");
}
