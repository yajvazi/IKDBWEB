import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { createSubresellerTopupPaymentIntent, listSubresellerTopups } from "@/server/subresellers/topups";

export const dynamic = "force-dynamic";

const createTopupSchema = z.object({
  resellerId: z.string().uuid(),
  amountMinor: z.number().int().positive(),
});

export async function GET() {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  return ok({ topups: await listSubresellerTopups() });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401);
  if (admin.role !== "super_admin") return fail("SUPER_ADMIN_REQUIRED", "Only super admins can create subreseller top-ups.", 403);

  const parsed = createTopupSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Top-up request is invalid.", 400, z.flattenError(parsed.error).fieldErrors);
  }

  try {
    const result = await createSubresellerTopupPaymentIntent({
      resellerId: parsed.data.resellerId,
      amountMinor: parsed.data.amountMinor,
      adminEmail: admin.email,
    });
    return ok(result, 201);
  } catch (error) {
    return fail("TOPUP_PAYMENT_INTENT_FAILED", error instanceof Error ? error.message : "Unable to create top-up PaymentIntent.", 400);
  }
}

async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401);
  if (admin.role !== "super_admin") return fail("SUPER_ADMIN_REQUIRED", "Only super admins can view subreseller top-ups.", 403);
  return null;
}

function ok(data: unknown, status = 200) {
  return NextResponse.json({
    success: true,
    data,
    meta: { requestId: randomUUID(), timestamp: new Date().toISOString() },
  }, { status });
}

function fail(code: string, message: string, status: number, fieldErrors?: Record<string, string[]>) {
  const requestId = randomUUID();
  return NextResponse.json({
    success: false,
    error: { code, message, requestId, fieldErrors },
  }, { status, headers: { "x-request-id": requestId } });
}
