import { getStripeClient, type StripeRuntimeMode } from "@/server/stripe/client";

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
  const rawCandidates: Array<{ mode: StripeRuntimeMode; secret?: string }> = [
    { mode: "live", secret: process.env.STRIPE_WEBHOOK_SECRET },
    { mode: "test", secret: process.env.STRIPE_TEST_WEBHOOK_SECRET },
  ];
  const candidates = rawCandidates.filter((candidate): candidate is { mode: StripeRuntimeMode; secret: string } => Boolean(candidate.secret));

  if (candidates.length === 0) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required for webhook verification.");
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return getStripeClient(candidate.mode).webhooks.constructEvent(payload, signature, candidate.secret!);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Stripe webhook signature verification failed.");
}
