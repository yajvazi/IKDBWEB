import { AnalyticsControls } from "@/components/admin/analytics-controls";
import {
  CountryBarChart,
  CustomerMixChart,
  PackageSalesChart,
  PaymentDonutChart,
  ProfitLineChart,
  RevenueAreaChart,
} from "@/components/charts/dashboard-charts";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-white shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Revenue, destinations, customer growth, activation, payment, and conversion funnel analysis.</p>
        </div>
        <AnalyticsControls />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel title="Daily Sales"><RevenueAreaChart /></Panel>
        <div className="xl:col-span-5">
          <Panel title="Top Destinations"><CountryBarChart /></Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4"><Panel title="Payment Method Split"><PaymentDonutChart /></Panel></div>
        <div className="xl:col-span-4"><Panel title="New vs Returning Customers"><CustomerMixChart /></Panel></div>
        <div className="xl:col-span-4"><Panel title="Gross Margin"><ProfitLineChart /></Panel></div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5"><Panel title="Top Packages"><PackageSalesChart /></Panel></div>
        <div className="xl:col-span-4">
          <Panel title="Conversion Funnel">
            <div className="space-y-2">
              {[
                ["App visits", "91,204", "100%"],
                ["Country views", "48,118", "52.8%"],
                ["Package views", "31,805", "34.9%"],
                ["Checkout started", "11,203", "12.3%"],
                ["Payment attempted", "9,273", "10.2%"],
                ["Successful payment", "8,932", "9.8%"],
                ["Provisioned eSIM", "8,884", "9.7%"],
                ["Activated eSIM", "7,821", "8.6%"],
              ].map(([label, value, rate]) => (
                <div key={label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="font-mono text-xs text-slate-500">{value}</span>
                  <span className="font-bold text-primary">{rate}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="xl:col-span-3">
          <Panel title="AI & Churn Signals">
            <div className="grid gap-3">
              {[
                ["Refund rate", "1.48%", "text-green-600"],
                ["Failed-payment rate", "3.67%", "text-red-600"],
                ["Activation rate", "88.0%", "text-green-600"],
                ["Repeat purchase", "36.1%", "text-primary"],
                ["Data consumed", "44.5 TB", "text-slate-900"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-md border border-border p-3">
                  <div className="text-[11px] font-semibold uppercase text-slate-500">{label}</div>
                  <div className={`mt-1 text-xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
