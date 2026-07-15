import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { getSubresellerTopupSettings, updateSubresellerTopupSettings } from "@/server/subresellers/topups";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  minimumAmountMinor: z.number().int().min(100),
  stripeMode: z.enum(["live", "test"]),
});

export async function GET() {
  const authError = await requireSuperAdmin();
  if (authError) return authError;
  return ok({ settings: await getSubresellerTopupSettings() });
}

export async function PATCH(request: NextRequest) {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Top-up settings are invalid.", 400, z.flattenError(parsed.error).fieldErrors);
  }

  try {
    const settings = await updateSubresellerTopupSettings({
      minimumAmountMinor: parsed.data.minimumAmountMinor,
      currency: "EUR",
      stripeMode: parsed.data.stripeMode,
    });
    return ok({ settings });
  } catch (error) {
    return fail("TOPUP_SETTINGS_SAVE_FAILED", error instanceof Error ? error.message : "Unable to save top-up settings.", 400);
  }
}

async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401);
  if (admin.role !== "super_admin") return fail("SUPER_ADMIN_REQUIRED", "Only super admins can configure subreseller top-ups.", 403);
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
