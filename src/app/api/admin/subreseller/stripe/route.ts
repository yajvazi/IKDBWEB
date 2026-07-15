import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { getAdminAccessPolicy } from "@/server/db/subresellers";
import { createSubresellerStripeOnboardingLink, getSubresellerStripeAccountSummary } from "@/server/stripe/connect";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = randomUUID();
  const access = await requireSubresellerAccess(requestId);
  if ("response" in access) return access.response;

  try {
    const stripe = await getSubresellerStripeAccountSummary({
      adminEmail: access.policy.adminEmail,
      resellerId: access.policy.resellerId,
      resellerName: access.policy.resellerName,
      ocsResellerId: access.policy.ocsResellerId,
      stripeAccountId: access.policy.stripeAccountId,
    });

    return ok({
      reseller: {
        id: access.policy.resellerId,
        name: access.policy.resellerName,
        ocsResellerId: access.policy.ocsResellerId,
        ocsAccountId: access.policy.ocsAccountId,
      },
      stripe,
    }, requestId);
  } catch (error) {
    return fail("SUBRESELLER_STRIPE_CONTEXT_FAILED", error instanceof Error ? error.message : "Unable to load Stripe account.", 400, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const access = await requireSubresellerAccess(requestId);
  if ("response" in access) return access.response;

  try {
    const link = await createSubresellerStripeOnboardingLink({
      policy: {
        adminEmail: access.policy.adminEmail,
        resellerId: access.policy.resellerId,
        resellerName: access.policy.resellerName,
        ocsResellerId: access.policy.ocsResellerId,
        stripeAccountId: access.policy.stripeAccountId,
      },
      origin: request.nextUrl.origin,
    });

    return ok(link, requestId, 201);
  } catch (error) {
    return fail("SUBRESELLER_STRIPE_ONBOARDING_FAILED", error instanceof Error ? error.message : "Unable to create Stripe onboarding link.", 400, requestId);
  }
}

async function requireSubresellerAccess(requestId: string) {
  const admin = await getCurrentAdmin();
  if (!admin) return { response: fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401, requestId) };
  if (admin.role === "super_admin") return { response: fail("SUBRESELLER_REQUIRED", "This Stripe account page is for subreseller accounts.", 403, requestId) };

  const policy = await getAdminAccessPolicy(admin.email);
  if (!policy) return { response: fail("SUBRESELLER_ACCESS_REQUIRED", "No subreseller profile is linked to this admin account.", 403, requestId) };

  return { admin, policy };
}

function ok(data: unknown, requestId: string, status = 200) {
  return NextResponse.json({
    success: true,
    data,
    meta: { requestId, timestamp: new Date().toISOString() },
  }, { status, headers: { "x-request-id": requestId } });
}

function fail(code: string, message: string, status: number, requestId: string = randomUUID()) {
  return NextResponse.json({
    success: false,
    error: { code, message, requestId },
  }, { status, headers: { "x-request-id": requestId } });
}
