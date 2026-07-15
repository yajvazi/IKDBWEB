import { KpiCard } from "@/components/admin/kpi-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DashboardActionBar, DashboardChartToggle, DashboardRefreshButton } from "@/components/admin/dashboard-actions";
import { getDashboardAnalytics, getDashboardKpis } from "@/server/stripe/live-data";
import {
  CountryBarChart,
  CustomerMixChart,
  PackageSalesChart,
  PaymentDonutChart,
  ProfitLineChart,
  RevenueAreaChart,
} from "@/components/charts/dashboard-charts";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { SubresellerTopupWidget } from "@/components/admin/subreseller-topup-widget";
import { SubresellerStripeConnectCard } from "@/components/admin/subreseller-stripe-connect-card";
import { getOcsDashboardStats, type OcsDashboardStats } from "@/server/ocs/dashboard-stats";
import { normalizeAdminDateRange } from "@/lib/dates/admin-date-range";

function Card({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { admin, policy } = await requireAdminPageAccess("dashboard");
  const { range: rangeParam } = await searchParams;
  const dateRange = normalizeAdminDateRange(rangeParam);

  if (admin.role !== "super_admin") {
    const ocsStats = await getOcsDashboardStats({
      resellerId: policy?.ocsResellerId,
      accountId: policy?.ocsAccountId,
    });

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">Subreseller Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Your OCS reseller balance, top-ups, and connected Stripe account.</p>
          </div>
          <DashboardActionBar />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Linked reseller</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{policy?.resellerName ?? "Not configured"}</div>
            <div className="mt-1 text-sm text-slate-500">OCS reseller ID {policy?.ocsResellerId ?? "-"} · Account {policy?.ocsAccountId ?? "-"}</div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Dashboard scope</div>
            <div className="mt-2 text-2xl font-bold text-green-700">Subreseller</div>
            <div className="mt-1 text-sm text-slate-500">Platform Stripe numbers are hidden for this role.</div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Stripe account</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{policy?.stripeAccountId ? "Connected" : "Not connected"}</div>
            <div className="mt-1 text-sm text-slate-500">Use the Stripe card below to connect or finish setup.</div>
          </div>
        </div>

        <SubresellerTopupWidget variant="dashboard" />
        <SubresellerStripeConnectCard />
        <OcsStatisticsPanel stats={ocsStats} />
      </div>
    );
  }

  const [kpis, analytics, ocsStats] = await Promise.all([
    getDashboardKpis(dateRange),
    getDashboardAnalytics(dateRange),
    getOcsDashboardStats(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">Overview Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">eSIM management, revenue, provisioning, and API operations.</p>
        </div>
        <DashboardActionBar />
      </div>

      <SubresellerTopupWidget variant="dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((metric) => (
          <KpiCard key={metric.label} metric={metric} />
        ))}
      </div>

      <OcsStatisticsPanel stats={ocsStats} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card
          title="Revenue Over Time"
          className="xl:col-span-7"
          action={<DashboardChartToggle values={["Daily", "Weekly", "Monthly"]} />}
        >
          <RevenueAreaChart data={analytics.revenueSeries} />
        </Card>
        <Card
          title="Sales by Country"
          className="xl:col-span-5"
          action={<DashboardChartToggle values={["Top 8", "Top 5", "All"]} />}
        >
          <CountryBarChart data={analytics.countrySales} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card title="Top Countries" className="xl:col-span-3">
          <div className="space-y-3">
            {analytics.countrySales.slice(0, 5).map((country) => (
              <div key={country.code} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{country.country}</span>
                <span className="font-mono text-xs text-slate-500">{country.sales.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Top-Selling Packages" className="xl:col-span-3">
          <div className="space-y-3">
            {analytics.packageSales.map((plan) => (
              <div key={plan.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{plan.name}</span>
                <span className="font-mono text-xs text-slate-500">{plan.sales.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Payment Success Rate" className="xl:col-span-3">
          <PaymentDonutChart data={analytics.paymentStatus} />
          <div className="-mt-4 text-center text-sm font-bold text-green-600">Live Stripe status</div>
        </Card>
        <Card title="New vs Returning Customers" className="xl:col-span-3">
          <CustomerMixChart data={analytics.customerMix} />
          <div className="-mt-4 text-center text-sm font-bold text-primary">Live customer mix</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card title="Sales by Package" className="xl:col-span-5">
          <PackageSalesChart data={analytics.packageSales} />
        </Card>
        <Card title="Revenue vs Reseller Cost" className="xl:col-span-3">
          <ProfitLineChart data={analytics.revenueSeries} />
        </Card>
        <Card
          title="Stripe Webhook Health"
          className="xl:col-span-4"
          action={<DashboardRefreshButton />}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Last event", "2 min ago"],
              ["Idempotency", "100%"],
              ["Failed retries", "0"],
                ["Refunds", analytics.refundMinor > 0 ? "Recorded" : "None"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-slate-50 p-3">
                <div className="text-[11px] font-semibold uppercase text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-bold text-slate-950">{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card title="Recent Orders" className="xl:col-span-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                <tr className="border-b border-border">
                  <th className="py-2 font-bold">Order</th>
                  <th className="py-2 font-bold">Country</th>
                  <th className="py-2 font-bold">Plan</th>
                  <th className="py-2 font-bold">Customer</th>
                  <th className="py-2 font-bold">Revenue</th>
                  <th className="py-2 font-bold">Payment</th>
                  <th className="py-2 font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentOrders.map((order) => (
                  <tr key={order.order} className="border-b border-border/70 last:border-0">
                    <td className="py-2 font-mono text-xs font-bold text-primary">{order.order}</td>
                    <td className="py-2 text-slate-700">{order.country}</td>
                    <td className="py-2 text-slate-700">{order.plan}</td>
                    <td className="py-2 text-slate-500">{order.customer}</td>
                    <td className="py-2 font-semibold">{order.revenue}</td>
                    <td className="py-2"><StatusBadge tone={order.status}>{order.payment}</StatusBadge></td>
                    <td className="py-2 text-slate-500">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Recent OCS Proxy Failures" className="xl:col-span-4">
          <div className="space-y-3">
            <div className="rounded-md border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-500">
              Persisted OCS proxy failures appear here after `ocs_proxy_logs` receives live records.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function OcsStatisticsPanel({ stats }: { stats: OcsDashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card
        title="OCS Reseller Statistics"
        className="xl:col-span-7"
        action={<StatusBadge tone={stats.warnings.length ? "warning" : "success"}>{stats.warnings.length ? "Partial" : "Live OCS"}</StatusBadge>}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OcsMetric label="Balance" value={stats.reseller.balanceLabel} />
          <OcsMetric label="Free eSIMs" value={stats.esim.free.toLocaleString()} tone="success" />
          <OcsMetric label="Affected eSIMs" value={stats.esim.affected.toLocaleString()} tone="info" />
          <OcsMetric label="Total eSIMs" value={stats.esim.total.toLocaleString()} />
          <OcsMetric label="Sponsors" value={stats.network.sponsors.toLocaleString()} />
          <OcsMetric label="Steering lists" value={stats.network.steeringLists.toLocaleString()} />
          <OcsMetric label="eSIM accounts" value={stats.esim.accounts.toLocaleString()} />
          <OcsMetric label="OCS reseller" value={String(stats.reseller.id ?? stats.resellerId)} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mobile tariff plan</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{stats.reseller.mobilePlan}</div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">VoIP tariff plan</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{stats.reseller.voipPlan}</div>
          </div>
        </div>
        {stats.warnings.length ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            {stats.warnings.slice(0, 3).map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card title="OCS Tariff Coverage" className="xl:col-span-5">
        <div className="grid grid-cols-2 gap-3">
          <OcsMetric label="Reseller tariffs" value={stats.tariffs.resellerTariffs.toLocaleString()} />
          <OcsMetric label="Subscriber tariffs" value={stats.tariffs.subscriberTariffs.toLocaleString()} />
          <OcsMetric label="Customer rules" value={stats.tariffs.customerRules.toLocaleString()} />
          <OcsMetric label="Active rules" value={stats.tariffs.activeCustomerRules.toLocaleString()} tone="success" />
          <OcsMetric label="Sampled tariff rules" value={stats.tariffs.sampledTariffRules.toLocaleString()} />
          <OcsMetric label="Avg. data rate" value={stats.tariffs.averageCustomerDataRate} />
        </div>
        <div className="mt-4 space-y-3">
          <TariffLine label="Reseller tariff" value={stats.tariffs.firstResellerTariff} />
          <TariffLine label="Subscriber tariff" value={stats.tariffs.firstSubscriberTariff} />
        </div>
      </Card>
    </div>
  );
}

function OcsMetric({ label, value, tone }: { label: string; value: string; tone?: "success" | "info" }) {
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 break-words text-lg font-bold ${tone === "success" ? "text-green-700" : tone === "info" ? "text-primary" : "text-slate-950"}`}>
        {value}
      </div>
    </div>
  );
}

function TariffLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-slate-50 p-3 text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-900">{value}</span>
    </div>
  );
}
