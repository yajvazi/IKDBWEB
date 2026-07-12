import { cn } from "@/lib/utils";
import type { StatusTone } from "@/types/admin";

const toneClass: Record<StatusTone, string> = {
  success: "bg-green-50 text-green-700 ring-green-600/15",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  error: "bg-red-50 text-red-700 ring-red-600/15",
  info: "bg-blue-50 text-blue-700 ring-blue-600/15",
  neutral: "bg-slate-50 text-slate-600 ring-slate-500/15",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
