import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { getAdminAccessPolicy } from "@/server/db/subresellers";
import { getResellerInfoCommand } from "@/server/ocs/commands";
import { getOcsClient } from "@/server/ocs/client";
import { getStripePublishableKey } from "@/server/stripe/client";
import { createSubresellerTopupPaymentIntent, getSubresellerTopupForReseller, getSubresellerTopupSettings } from "@/server/subresellers/topups";

export const dynamic = "force-dynamic";

const createTopupSchema = z.object({
  amountMinor: z.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const requestId = randomUUID();
  const access = await requireSubresellerAccess(requestId);
  if ("response" in access) return access.response;

  try {
    const [settings, balance] = await Promise.all([
      getSubresellerTopupSettings(),
      readOcsResellerBalance(access.policy.ocsResellerId),
    ]);
    const topupId = request.nextUrl.searchParams.get("topupId");
    const topup = topupId ? await getSubresellerTopupForReseller({ topupId, resellerId: access.policy.resellerId }) : null;

    return ok({
      available: true,
      reseller: {
        id: access.policy.resellerId,
        name: access.policy.resellerName,
        ocsResellerId: access.policy.ocsResellerId,
        ocsAccountId: access.policy.ocsAccountId,
        balance,
      },
      settings,
      publishableKey: getStripePublishableKey(settings.stripeMode),
      topup,
    }, requestId);
  } catch (error) {
    return fail("SUBRESELLER_TOPUP_CONTEXT_FAILED", error instanceof Error ? error.message : "Unable to load subreseller balance.", 400, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const access = await requireSubresellerAccess(requestId);
  if ("response" in access) return access.response;

  const parsed = createTopupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Top-up request is invalid.", 400, requestId, z.flattenError(parsed.error).fieldErrors);
  }

  try {
    const settings = await getSubresellerTopupSettings();
    const result = await createSubresellerTopupPaymentIntent({
      resellerId: access.policy.resellerId,
      amountMinor: parsed.data.amountMinor,
      adminEmail: access.admin.email,
    });

    return ok({
      ...result,
      publishableKey: getStripePublishableKey(settings.stripeMode),
      stripeMode: settings.stripeMode,
    }, requestId, 201);
  } catch (error) {
    return fail("TOPUP_PAYMENT_INTENT_FAILED", error instanceof Error ? error.message : "Unable to create top-up PaymentIntent.", 400, requestId);
  }
}

async function requireSubresellerAccess(requestId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) return { response: fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401, requestId) };
  if (admin.role === "super_admin") return { response: fail("SUBRESELLER_REQUIRED", "This top-up widget is for subreseller accounts.", 403, requestId) };

  const policy = await getAdminAccessPolicy(admin.email);
  if (!policy) return { response: fail("SUBRESELLER_ACCESS_REQUIRED", "No subreseller profile is linked to this admin account.", 403, requestId) };

  return { admin, policy };
}

async function readOcsResellerBalance(ocsResellerId: number) {
  const response = await getOcsClient().executeCommand(getResellerInfoCommand({ id: ocsResellerId }));
  const info = response.getResellerInfo;
  const record = info && typeof info === "object" ? info as Record<string, unknown> : {};

  return {
    raw: typeof record.balance === "string" || typeof record.balance === "number" ? record.balance : null,
    label: formatBalance(record.balance),
    name: typeof record.name === "string" ? record.name : null,
    upstream: record,
  };
}

function ok(data: unknown, requestId: string, status = 200) {
  return NextResponse.json({
    success: true,
    data,
    meta: { requestId, timestamp: new Date().toISOString() },
  }, { status, headers: { "x-request-id": requestId } });
}

function fail(code: string, message: string, status: number, requestId: string = randomUUID(), fieldErrors?: Record<string, string[]>) {
  return NextResponse.json({
    success: false,
    error: { code, message, requestId, fieldErrors },
  }, { status, headers: { "x-request-id": requestId } });
}

function formatBalance(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(parsed)) return "Balance unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(parsed);
}
