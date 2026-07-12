# Stripe Configuration

Stripe secrets are server-only. The mobile app and public website must use the API gateway for PaymentIntent creation and must never receive `STRIPE_SECRET_KEY` or webhook secrets.

Required webhook events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `charge.refund.updated`
- `charge.dispute.created`
- `charge.dispute.closed`

Webhook handlers must verify signatures, record events idempotently, update payment state, enqueue provisioning, and return quickly. Provisioning must not run inside the webhook request.
