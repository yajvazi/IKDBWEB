export type ReconciliationStatus = "matched" | "missing_local_payment" | "missing_stripe_payment" | "amount_mismatch";

export function reconcilePayment(input: { localAmountMinor: number; stripeAmountMinor: number; localPaymentExists: boolean; stripePaymentExists: boolean }): ReconciliationStatus {
  if (!input.localPaymentExists) return "missing_local_payment";
  if (!input.stripePaymentExists) return "missing_stripe_payment";
  if (input.localAmountMinor !== input.stripeAmountMinor) return "amount_mismatch";
  return "matched";
}
