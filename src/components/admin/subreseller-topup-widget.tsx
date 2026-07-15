"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { CreditCard, RefreshCw, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";
import { cn } from "@/lib/utils";

type TopupContext = {
  available: true;
  reseller: {
    id: string;
    name: string;
    ocsResellerId: number;
    ocsAccountId: number | null;
    balance: {
      raw: string | number | null;
      label: string;
      name: string | null;
    };
  };
  settings: {
    minimumAmountMinor: number;
    currency: "EUR";
    stripeMode: "live" | "test";
  };
  publishableKey: string;
  topup?: {
    id: string;
    paymentStatus: string;
    ocsStatus: string;
    lastError: string | null;
    netAmountMinor: number;
    currency: string;
  } | null;
};

type CreatedTopup = {
  topup: {
    id: string;
    amountMinor: number;
    currency: string;
    paymentStatus: string;
    ocsStatus: string;
  };
  clientSecret: string;
  publishableKey: string;
  stripeMode: "live" | "test";
};

const stripePromiseCache = new Map<string, Promise<Stripe | null>>();

export function SubresellerBalanceLabel({ className }: { className?: string }) {
  const { context } = useSubresellerTopupContext();
  if (!context) return null;

  return (
    <div className={cn("text-[10px] font-semibold text-green-700", className)}>
      {context.reseller.balance.label}
    </div>
  );
}

export function SubresellerTopupWidget({ variant = "dashboard" }: { variant?: "dashboard" | "menu" }) {
  const { context, loading, reload } = useSubresellerTopupContext();
  const [amount, setAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedTopup | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const visibleAmount = amount || (context ? minorToInput(context.settings.minimumAmountMinor) : "");
  const publishableKey = created?.publishableKey ?? null;

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    if (!stripePromiseCache.has(publishableKey)) {
      stripePromiseCache.set(publishableKey, loadStripe(publishableKey));
    }
    return stripePromiseCache.get(publishableKey) ?? null;
  }, [publishableKey]);

  if (!context && !loading) return null;

  async function createPaymentIntent(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!context) return;

    setCreating(true);
    setProcessingMessage(null);
    try {
      const amountMinor = euroInputToMinor(visibleAmount);
      if (amountMinor < context.settings.minimumAmountMinor) {
        throw new Error(`Minimum top-up is ${formatMinor(context.settings.minimumAmountMinor, context.settings.currency)}.`);
      }

      const response = await fetch("/api/admin/subreseller/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountMinor }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to create top-up payment.");

      setCreated(json.data);
      setPaymentOpen(true);
      showToast("Payment form opened. Enter card details to complete the top-up.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to start top-up.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function pollBalance(topupId: string) {
    setProcessingMessage("Payment captured. Waiting for OCS balance update...");

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await delay(1500);
      const response = await fetch(`/api/admin/subreseller/topup?topupId=${encodeURIComponent(topupId)}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) continue;

      if (json.data.topup?.ocsStatus === "applied") {
        setPaymentOpen(false);
        setCreated(null);
        setProcessingMessage(null);
        await reload();
        showToast("Balance updated in OCS.", "success");
        return;
      }

      if (json.data.topup?.ocsStatus === "failed") {
        setProcessingMessage(null);
        await reload();
        showToast(json.data.topup.lastError ?? "Payment captured, but OCS balance update failed.", "error");
        return;
      }
    }

    setProcessingMessage("Payment captured. OCS balance update is still processing.");
    await reload();
  }

  if (variant === "menu") {
    return (
      <div className="my-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">OCS balance</div>
            <div className="mt-1 text-base font-bold text-slate-950">{context?.reseller.balance.label ?? "Loading..."}</div>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={reload} disabled={loading}>
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          </Button>
        </div>
        <form className="mt-3 flex gap-2" onSubmit={createPaymentIntent}>
          <input
            value={visibleAmount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
            placeholder="500"
          />
          <Button type="submit" size="sm" disabled={creating || !context}>
            {creating ? "Opening..." : "Top up"}
          </Button>
        </form>
        {renderPaymentModal({ paymentOpen, setPaymentOpen, created, stripePromise, processingMessage, pollBalance })}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950">Subreseller balance</h2>
            <p className="text-xs text-slate-500">{context?.reseller.name ?? "Linked OCS reseller"}</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">OCS balance</div>
            <div className="mt-1 text-2xl font-bold text-slate-950">{context?.reseller.balance.label ?? "Loading..."}</div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Reseller ID</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{context?.reseller.ocsResellerId ?? "-"}</div>
          </div>
          <div className="rounded-md border border-border bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Minimum top-up</div>
            <div className="mt-1 text-lg font-bold text-slate-950">{context ? formatMinor(context.settings.minimumAmountMinor, context.settings.currency) : "-"}</div>
          </div>
        </div>
        <form className="rounded-lg border border-blue-100 bg-blue-50 p-3" onSubmit={createPaymentIntent}>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Top-up amount EUR</span>
            <input
              value={visibleAmount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-4"
              placeholder="500"
            />
          </label>
          <Button type="submit" className="mt-3 w-full" disabled={creating || !context}>
            <CreditCard className="h-4 w-4" />
            {creating ? "Opening payment..." : "Top up with Stripe"}
          </Button>
          <div className="mt-2 text-xs leading-5 text-slate-600">OCS receives the paid amount minus Stripe fees.</div>
        </form>
      </div>
      {renderPaymentModal({ paymentOpen, setPaymentOpen, created, stripePromise, processingMessage, pollBalance })}
    </section>
  );
}

function PaymentForm({ topupId, onSuccess }: { topupId: string; onSuccess: (topupId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Stripe payment failed.");
      }

      showToast("Payment captured by Stripe.", "success");
      onSuccess(topupId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Payment failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitPayment}>
      <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
        {!elementReady && !elementError ? (
          <div className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
            Loading secure card form...
          </div>
        ) : null}
        {elementError ? (
          <div className="mb-3 rounded-md border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {elementError}
          </div>
        ) : null}
        <div className="min-h-[164px]">
          <PaymentElement
            options={{ layout: "tabs" }}
            onReady={() => {
              setElementReady(true);
              setElementError(null);
            }}
            onLoaderStart={() => {
              setElementReady(false);
              setElementError(null);
            }}
            onLoadError={(event) => {
              setElementReady(false);
              setElementError(event.error.message || "Stripe could not load the secure card form. Refresh and try again.");
            }}
          />
        </div>
      </div>
      <Button type="submit" className="mt-4 w-full" disabled={!stripe || !elements || !elementReady || Boolean(elementError) || submitting}>
        <CreditCard className="h-4 w-4" />
        {submitting ? "Processing..." : elementReady ? "Pay now" : "Loading card form..."}
      </Button>
    </form>
  );
}

function renderPaymentModal(input: {
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  created: CreatedTopup | null;
  stripePromise: Promise<Stripe | null> | null;
  processingMessage: string | null;
  pollBalance: (topupId: string) => void;
}) {
  if (!input.paymentOpen || !input.created || !input.stripePromise) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-base font-bold text-slate-950">Complete balance top-up</div>
            <div className="mt-1 text-xs text-slate-500">{formatMinor(input.created.topup.amountMinor, input.created.topup.currency)} · Stripe {input.created.stripeMode}</div>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md border border-border text-slate-500 hover:bg-slate-50"
            onClick={() => input.setPaymentOpen(false)}
            aria-label="Close payment popup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {input.processingMessage ? (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
              {input.processingMessage}
            </div>
          ) : (
            <Elements
              stripe={input.stripePromise}
              options={{
                clientSecret: input.created.clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#004FFE",
                    colorText: "#111827",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <PaymentForm topupId={input.created.topup.id} onSuccess={input.pollBalance} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

function useSubresellerTopupContext() {
  const [context, setContext] = useState<TopupContext | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/subreseller/topup", { cache: "no-store" });
      const json = await response.json();
      if (response.status === 403 || response.status === 401) {
        setContext(null);
        return;
      }
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Unable to load subreseller balance.");
      setContext(json.data);
    } catch (error) {
      setContext(null);
      showToast(error instanceof Error ? error.message : "Unable to load subreseller balance.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, []);

  return { context, loading, reload: load };
}

function euroInputToMinor(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Enter a valid EUR amount.");
  return Math.round(parsed * 100);
}

function minorToInput(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, "");
}

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
