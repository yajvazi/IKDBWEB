import { getStripeClient } from "@/server/stripe/client";

export async function createOrderPaymentIntent(input: {
  orderId: string;
  amountMinor: number;
  currency: string;
  customerId?: string;
}) {
  const stripe = getStripeClient();

  return stripe.paymentIntents.create(
    {
      amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      customer: input.customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: input.orderId },
    },
    { idempotencyKey: `internetkudo-order-${input.orderId}` },
  );
}
