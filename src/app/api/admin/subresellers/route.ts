import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminApiGroupOptions, adminPageOptions, type AdminApiGroup, type AdminPageKey } from "@/lib/admin/pages";
import { getCurrentAdmin } from "@/server/auth/admin-auth";
import { listSubresellerProfiles, syncSubresellersFromOcs, upsertSubresellerProfile } from "@/server/db/subresellers";

export const dynamic = "force-dynamic";

const pageKeys = adminPageOptions.map((item) => item.key) as [string, ...string[]];
const apiGroups = [...adminApiGroupOptions] as [string, ...string[]];

const subresellerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  active: z.boolean().default(true),
  ocsResellerId: z.number().int().positive(),
  ocsAccountId: z.number().int().positive().nullable().optional(),
  stripeProfileId: z.string().min(2).max(120).default("internetkudo-platform"),
  stripeAccountId: z.string().max(120).nullable().optional(),
  adminEmail: z.string().email().nullable().optional(),
  allowedDashboardPages: z.array(z.enum(pageKeys)).min(1),
  allowedApiGroups: z.array(z.enum(apiGroups)).min(1),
  rateLimitPerMinute: z.number().int().min(5).max(10000).default(120),
  canViewCosts: z.boolean().default(false),
  canIssueRefunds: z.boolean().default(false),
  canRevealEsimSecrets: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET() {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  let ocsResellerAccounts: Awaited<ReturnType<typeof syncSubresellersFromOcs>> = [];
  let ocsSyncError: string | null = null;
  try {
    ocsResellerAccounts = await syncSubresellersFromOcs();
  } catch (error) {
    ocsSyncError = error instanceof Error ? error.message : "Unable to sync OCS reseller accounts.";
  }

  const profiles = await listSubresellerProfiles();
  return ok({ profiles, ocsResellerAccounts, ocsSyncError, pageOptions: adminPageOptions, apiGroupOptions: adminApiGroupOptions });
}

export async function POST(request: NextRequest) {
  const authError = await requireSuperAdmin();
  if (authError) return authError;

  const parsed = subresellerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Subreseller settings are invalid.", 400, z.flattenError(parsed.error).fieldErrors);
  }

  try {
    const profile = await upsertSubresellerProfile({
      ...parsed.data,
      allowedDashboardPages: parsed.data.allowedDashboardPages as AdminPageKey[],
      allowedApiGroups: parsed.data.allowedApiGroups as AdminApiGroup[],
    });
    return ok({ profile }, parsed.data.id ? 200 : 201);
  } catch (error) {
    return fail("SUBRESELLER_SAVE_FAILED", error instanceof Error ? error.message : "Unable to save subreseller settings.", 400);
  }
}

async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return fail("ADMIN_SESSION_REQUIRED", "Admin session required.", 401);
  if (admin.role !== "super_admin") return fail("SUPER_ADMIN_REQUIRED", "Only super admins can configure subresellers.", 403);
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
