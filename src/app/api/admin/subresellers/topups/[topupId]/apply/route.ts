import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { applyPaidSubresellerTopup } from "@/server/subresellers/topups";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ topupId: z.string().uuid() });

export async function POST(_request: NextRequest, context: { params: Promise<{ topupId: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401);
  if (admin.role !== "super_admin") return fail("SUPER_ADMIN_REQUIRED", "Only super admins can apply subreseller top-ups.", 403);

  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid top-up ID.", 400, z.flattenError(parsed.error).fieldErrors);

  try {
    const result = await applyPaidSubresellerTopup(parsed.data.topupId, {
      source: "admin",
      requestId: randomUUID(),
    });

    if (!result.applied) return fail("OCS_BALANCE_UPDATE_FAILED", result.error ?? "OCS balance update failed.", 409);
    return ok(result);
  } catch (error) {
    return fail("TOPUP_APPLY_FAILED", error instanceof Error ? error.message : "Unable to apply top-up.", 400);
  }
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
