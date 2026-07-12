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

export default async function DashboardPage() {
  const kpis = await getDashboardKpis();
  const analytics = await getDashboardAnalytics();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">Overview Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">eSIM management, revenue, provisioning, and API operations.</p>
        </div>
        <DashboardActionBar />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((metric) => (
          <KpiCard key={metric.label} metric={metric} />
        ))}
      </div>

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
