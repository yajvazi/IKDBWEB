import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!stripe) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) throw new Error("STRIPE_SECRET_KEY is required for Stripe operations.");
    stripe = new Stripe(secret, { apiVersion: "2026-06-24.dahlia" });
  }

  return stripe;
}
