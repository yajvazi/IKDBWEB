import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getProvisioningQueue } from "@/server/jobs/queue";
import { constructStripeWebhookEvent, supportedStripeWebhookEvents } from "@/server/stripe/webhooks";
import { handleSubresellerTopupPaymentSucceeded } from "@/server/subresellers/topups";

export const runtime = "nodejs";

const supportedEvents = new Set<string>(supportedStripeWebhookEvents);

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      service: "stripe-webhook",
      status: "ready",
      supportedEvents: supportedStripeWebhookEvents,
    },
    meta: { requestId: randomUUID(), timestamp: new Date().toISOString() },
  });
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return webhookError("MISSING_SIGNATURE", "Missing Stripe signature header.", requestId, 400);
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = constructStripeWebhookEvent(payload, signature);
  } catch (error) {
    console.error("Stripe webhook verification failed", {
      requestId,
      message: error instanceof Error ? error.message : "Unknown verification error",
    });
    return webhookError("INVALID_SIGNATURE", "Stripe webhook signature verification failed.", requestId, 400);
  }

  if (!supportedEvents.has(event.type)) {
    return NextResponse.json({
      success: true,
      data: { received: true, ignored: true, eventId: event.id, eventType: event.type },
      meta: { requestId, timestamp: new Date().toISOString() },
    });
  }

  try {
    await handleStripeEvent(event, requestId);
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      requestId,
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "Unknown processing error",
    });

    return webhookError("WEBHOOK_PROCESSING_FAILED", "Stripe webhook processing failed.", requestId, 500);
  }

  return NextResponse.json({
    success: true,
    data: { received: true, eventId: event.id, eventType: event.type },
    meta: { requestId, timestamp: new Date().toISOString() },
  });
}

async function handleStripeEvent(event: Stripe.Event, requestId: string) {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const topupResult = await handleSubresellerTopupPaymentSucceeded(paymentIntent, requestId);
      if (topupResult.handled) return;

      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await getProvisioningQueue().enqueueProvisioning({
          orderId,
          paymentIntentId: paymentIntent.id,
          requestId,
        });
      }
      return;
    }

    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
    case "charge.refunded":
    case "charge.refund.updated":
    case "charge.dispute.created":
    case "charge.dispute.closed":
      return;

    default:
      return;
  }
}

function webhookError(code: string, message: string, requestId: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, requestId },
    },
    { status },
  );
}
