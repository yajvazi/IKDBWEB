import { getStripeClient } from "@/server/stripe/client";

export async function issueRefund(input: { paymentIntentId: string; amountMinor?: number; reason?: string }) {
  const stripe = getStripeClient();
  return stripe.refunds.create(
    {
      payment_intent: input.paymentIntentId,
      amount: input.amountMinor,
      metadata: input.reason ? { reason: input.reason } : undefined,
    },
    { idempotencyKey: `internetkudo-refund-${input.paymentIntentId}-${input.amountMinor ?? "full"}` },
  );
}
