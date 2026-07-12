import { getStripeClient } from "@/server/stripe/client";

export async function getOrCreateStripeCustomer(input: { email: string; name?: string; existingStripeCustomerId?: string }) {
  const stripe = getStripeClient();
  if (input.existingStripeCustomerId) return stripe.customers.retrieve(input.existingStripeCustomerId);
  return stripe.customers.create({ email: input.email, name: input.name });
}
