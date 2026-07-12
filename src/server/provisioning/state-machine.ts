export const orderStatuses = [
  "draft",
  "pending_payment",
  "paid",
  "provisioning",
  "fulfilled",
  "partially_refunded",
  "refunded",
  "failed",
  "canceled",
  "manual_review",
] as const;

export const provisioningStatuses = [
  "not_started",
  "queued",
  "in_progress",
  "completed",
  "retryable_failure",
  "permanent_failure",
  "manual_review",
] as const;

export const paymentStatuses = [
  "requires_payment",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "partially_refunded",
  "refunded",
  "disputed",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type ProvisioningStatus = (typeof provisioningStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export function nextOrderStatusFromPayment(status: PaymentStatus): OrderStatus {
  if (status === "succeeded") return "paid";
  if (status === "failed") return "failed";
  if (status === "canceled") return "canceled";
  if (status === "refunded") return "refunded";
  if (status === "partially_refunded") return "partially_refunded";
  if (status === "disputed") return "manual_review";
  return "pending_payment";
}
