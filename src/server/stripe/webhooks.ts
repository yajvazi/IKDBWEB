import { getStripeClient } from "@/server/stripe/client";

export const supportedStripeWebhookEvents = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "charge.refund.updated",
  "charge.dispute.created",
  "charge.dispute.closed",
] as const;

export function constructStripeWebhookEvent(payload: string | Buffer, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is required for webhook verification.");
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
}
