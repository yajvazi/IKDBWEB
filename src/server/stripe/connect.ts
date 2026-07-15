import "server-only";

import type Stripe from "stripe";
import { updateSubresellerStripeAccount } from "@/server/db/subresellers";
import { getStripeClient, type StripeRuntimeMode } from "@/server/stripe/client";
import { getSubresellerTopupSettings } from "@/server/subresellers/topups";

export type SubresellerStripePolicy = {
  adminEmail: string;
  resellerId: string;
  resellerName: string;
  ocsResellerId: number;
  stripeAccountId: string | null;
};

export type SubresellerStripeAccountSummary = {
  connected: boolean;
  mode: StripeRuntimeMode;
  accountId: string | null;
  displayName: string | null;
  country: string | null;
  defaultCurrency: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: string[];
  availableBalance: MoneyAmount[];
  pendingBalance: MoneyAmount[];
  recentPayments: Array<{
    id: string;
    amount: string;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  loginUrl: string | null;
};

type MoneyAmount = {
  amountMinor: number;
  currency: string;
  label: string;
};

export async function getSubresellerStripeAccountSummary(policy: SubresellerStripePolicy): Promise<SubresellerStripeAccountSummary> {
  const settings = await getSubresellerTopupSettings();
  if (!policy.stripeAccountId) return emptySummary(settings.stripeMode);

  const stripe = getStripeClient(settings.stripeMode);

  try {
    const [account, balance, intents, loginLink] = await Promise.all([
      stripe.accounts.retrieve(policy.stripeAccountId),
      stripe.balance.retrieve({}, { stripeAccount: policy.stripeAccountId }),
      stripe.paymentIntents.list({ limit: 10 }, { stripeAccount: policy.stripeAccountId }),
      createLoginLink(stripe, policy.stripeAccountId),
    ]);

    return {
      connected: true,
      mode: settings.stripeMode,
      accountId: account.id,
      displayName: account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? account.email ?? policy.resellerName,
      country: account.country ?? null,
      defaultCurrency: account.default_currency ?? null,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      requirementsDue: account.requirements?.currently_due ?? [],
      availableBalance: balance.available.map(moneyAmount),
      pendingBalance: balance.pending.map(moneyAmount),
      recentPayments: intents.data.map((intent) => ({
        id: intent.id,
        amount: formatMoney(intent.amount, intent.currency),
        currency: intent.currency.toUpperCase(),
        status: intent.status,
        createdAt: new Date(intent.created * 1000).toISOString(),
      })),
      loginUrl: loginLink,
    };
  } catch (error) {
    return {
      ...emptySummary(settings.stripeMode),
      connected: true,
      accountId: policy.stripeAccountId,
      displayName: policy.resellerName,
      requirementsDue: [error instanceof Error ? error.message : "Unable to load connected Stripe account."],
    };
  }
}

export async function createSubresellerStripeOnboardingLink(input: {
  policy: SubresellerStripePolicy;
  origin: string;
}) {
  const settings = await getSubresellerTopupSettings();
  const stripe = getStripeClient(settings.stripeMode);
  const accountId = input.policy.stripeAccountId ?? await createConnectedAccount({ stripe, policy: input.policy, mode: settings.stripeMode });
  const baseUrl = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL || input.origin);

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${baseUrl}/admin/dashboard?stripe_connect=refresh`,
    return_url: `${baseUrl}/admin/dashboard?stripe_connect=return`,
  });

  return {
    url: link.url,
    accountId,
    mode: settings.stripeMode,
  };
}

async function createConnectedAccount(input: {
  stripe: Stripe;
  policy: SubresellerStripePolicy;
  mode: StripeRuntimeMode;
}) {
  const country = (process.env.STRIPE_CONNECT_COUNTRY || "US").trim().toUpperCase();
  const account = await input.stripe.accounts.create({
    type: "express",
    country,
    email: input.policy.adminEmail,
    business_profile: {
      name: input.policy.resellerName,
      product_description: "InternetKudo eSIM and mobile data package sales",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      internetkudoResellerId: input.policy.resellerId,
      ocsResellerId: String(input.policy.ocsResellerId),
      stripeMode: input.mode,
    },
  });

  await updateSubresellerStripeAccount({
    resellerId: input.policy.resellerId,
    stripeAccountId: account.id,
    stripeProfileId: `internetkudo-connect-${input.mode}`,
  });

  return account.id;
}

async function createLoginLink(stripe: Stripe, accountId: string) {
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    return link.url;
  } catch {
    return null;
  }
}

function emptySummary(mode: StripeRuntimeMode): SubresellerStripeAccountSummary {
  return {
    connected: false,
    mode,
    accountId: null,
    displayName: null,
    country: null,
    defaultCurrency: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    requirementsDue: [],
    availableBalance: [],
    pendingBalance: [],
    recentPayments: [],
    loginUrl: null,
  };
}

function moneyAmount(amount: Stripe.Balance.Available | Stripe.Balance.Pending): MoneyAmount {
  return {
    amountMinor: amount.amount,
    currency: amount.currency.toUpperCase(),
    label: formatMoney(amount.amount, amount.currency),
  };
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, "");
}
