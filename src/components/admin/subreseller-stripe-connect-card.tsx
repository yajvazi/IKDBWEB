"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type StripeContext = {
  reseller: {
    id: string;
    name: string;
    ocsResellerId: number;
    ocsAccountId: number | null;
  };
  stripe: {
    connected: boolean;
    mode: "live" | "test";
    accountId: string | null;
    displayName: string | null;
    country: string | null;
    defaultCurrency: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsDue: string[];
    availableBalance: Array<{ amountMinor: number; currency: string; label: string }>;
    pendingBalance: Array<{ amountMinor: number; currency: string; label: string }>;
    recentPayments: Array<{
      id: string;
      amount: string;
      currency: string;
      status: string;
      createdAt: string;
    }>;
    loginUrl: string | null;
  };
};

export function SubresellerStripeConnectCard() {
  const [context, setContext] = useState<StripeContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/subreseller/stripe", { cache: "no-store" });
      const json = await response.json();
      if (response.status === 401 || response.status === 403) {
        setContext(null);
        return;
      }
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to load Stripe account.");
      setContext(json.data);
    } catch (error) {
      setContext(null);
      showToast(error instanceof Error ? error.message : "Unable to load Stripe account.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function connectStripe() {
    setConnecting(true);
    try {
      const response = await fetch("/api/admin/subreseller/stripe", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to start Stripe onboarding.");
      showToast("Opening Stripe onboarding.", "success");
      window.location.href = json.data.url;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to start Stripe onboarding.", "error");
    } finally {
      setConnecting(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!context && !loading) return null;

  const stripe = context?.stripe;
  const available = stripe?.availableBalance.length ? stripe.availableBalance.map((item) => item.label).join(", ") : "No available balance";
  const pending = stripe?.pendingBalance.length ? stripe.pendingBalance.map((item) => item.label).join(", ") : "No pending balance";

  return (
    <section className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950">Subreseller Stripe account</h2>
            <p className="text-xs text-slate-500">{context?.reseller.name ?? "Connected-account payments and payouts"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
          {stripe?.loginUrl ? (
            <Button type="button" size="sm" onClick={() => window.open(stripe.loginUrl ?? "", "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4" />
              Open Stripe
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Mode" value={stripe?.mode ?? "..."} tone={stripe?.mode === "live" ? "green" : "amber"} />
          <Metric label="Charges" value={stripe?.chargesEnabled ? "Enabled" : "Not ready"} tone={stripe?.chargesEnabled ? "green" : "amber"} />
          <Metric label="Payouts" value={stripe?.payoutsEnabled ? "Enabled" : "Not ready"} tone={stripe?.payoutsEnabled ? "green" : "amber"} />
          <Metric label="Available balance" value={available} />
          <Metric label="Pending balance" value={pending} />
          <Metric label="Country" value={stripe?.country ?? "-"} />
          <Metric label="Currency" value={stripe?.defaultCurrency?.toUpperCase() ?? "-"} />
          <Metric label="Account" value={stripe?.accountId ? maskStripeAccount(stripe.accountId) : "Not connected"} />
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
          {stripe?.connected ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-green-600" />
                <span>{stripe.detailsSubmitted ? "Stripe setup submitted." : "Finish Stripe onboarding to enable payments and payouts."}</span>
              </div>
              {stripe.requirementsDue.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {stripe.requirementsDue.length} Stripe requirement{stripe.requirementsDue.length === 1 ? "" : "s"} still due.
                </div>
              ) : null}
              <Button type="button" className="w-full" onClick={connectStripe} disabled={connecting}>
                {connecting ? "Opening..." : stripe.detailsSubmitted ? "Update Stripe setup" : "Continue Stripe setup"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-bold text-slate-950">Connect your own Stripe</div>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  This keeps your dashboard scoped to your connected Stripe account instead of the InternetKudo platform account.
                </p>
              </div>
              <Button type="button" className="w-full" onClick={connectStripe} disabled={connecting || loading}>
                <CreditCard className="h-4 w-4" />
                {connecting ? "Opening..." : "Connect Stripe account"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {stripe?.recentPayments.length ? (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Recent connected-account payments</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <tbody>
                {stripe.recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/70 last:border-0">
                    <td className="py-2 font-mono text-xs font-bold text-primary">{payment.id}</td>
                    <td className="py-2 font-semibold text-slate-900">{payment.amount}</td>
                    <td className="py-2 text-slate-500">{payment.status}</td>
                    <td className="py-2 text-right text-slate-500">{new Date(payment.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" }) {
  return (
    <div className="rounded-md border border-border bg-slate-50 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn(
        "mt-1 break-words text-lg font-bold text-slate-950",
        tone === "green" && "text-green-700",
        tone === "amber" && "text-amber-700",
      )}>
        {value}
      </div>
    </div>
  );
}

function maskStripeAccount(value: string) {
  if (value.length <= 10) return value;
  return `${value.slice(0, 7)}...${value.slice(-4)}`;
}
