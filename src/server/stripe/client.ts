import Stripe from "stripe";

export type StripeRuntimeMode = "live" | "test";

const clients: Partial<Record<StripeRuntimeMode, Stripe>> = {};

export function getStripeClient(mode: StripeRuntimeMode = "live") {
  if (!clients[mode]) {
    const secret = stripeSecretForMode(mode);
    clients[mode] = new Stripe(secret, { apiVersion: "2026-06-24.dahlia" });
  }

  return clients[mode];
}

export function stripeSecretForMode(mode: StripeRuntimeMode) {
  const secret = mode === "test" ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(mode === "test" ? "STRIPE_TEST_SECRET_KEY is required for test-mode Stripe operations." : "STRIPE_SECRET_KEY is required for Stripe operations.");
  }
  return secret;
}
