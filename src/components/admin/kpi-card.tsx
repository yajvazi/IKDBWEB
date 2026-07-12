import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import type { KpiMetric } from "@/types/admin";
import { cn } from "@/lib/utils";

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const positive = metric.trend === "up";

  return (
    <article className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {metric.label}
            <span title={metric.tooltip}>
              <Info className="h-3.5 w-3.5 text-slate-400" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{metric.value}</div>
        </div>
        <span className="rounded-md bg-blue-50 p-2 text-primary">
          {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-500">Prev. {metric.previous}</span>
        <span className={cn("font-bold", positive ? "text-green-600" : "text-red-600")}>{metric.change}</span>
      </div>
    </article>
  );
}
