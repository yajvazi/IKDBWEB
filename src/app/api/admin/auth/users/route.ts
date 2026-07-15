import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoles, createAdminUser, getCurrentAdmin, listAdminUsers } from "@/server/auth/admin-auth";
import { adminApiGroupOptions, adminPageOptions } from "@/lib/admin/pages";
import { upsertSubresellerProfile } from "@/server/db/subresellers";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(adminRoles),
  password: z.string().min(10),
  profile: z.object({
    name: z.string().min(2),
    active: z.boolean().default(true),
    ocsResellerId: z.number().int().positive(),
    ocsAccountId: z.number().int().positive().nullable().optional(),
    stripeProfileId: z.string().min(1).default("internetkudo-platform"),
    stripeAccountId: z.string().trim().min(1).nullable().optional(),
    allowedDashboardPages: z.array(z.enum(adminPageOptions.map((page) => page.key))).min(1),
    allowedApiGroups: z.array(z.enum(adminApiGroupOptions)).min(1),
    rateLimitPerMinute: z.number().int().positive().max(10000),
    canViewCosts: z.boolean().default(false),
    canIssueRefunds: z.boolean().default(false),
    canRevealEsimSecrets: z.boolean().default(false),
    notes: z.string().nullable().optional(),
  }).optional(),
});

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return unauthorized();

  return NextResponse.json({ success: true, data: { users: await listAdminUsers() } });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return unauthorized();
  if (admin.role !== "super_admin") {
    return NextResponse.json({ success: false, error: { message: "Only super admins can create admin accounts." } }, { status: 403 });
  }

  const parsed = createUserSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      error: {
        message: "Admin account details are invalid.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
    }, { status: 400 });
  }

  try {
    const needsProfile = parsed.data.role === "subreseller" || parsed.data.role === "vendor";
    if (needsProfile && !parsed.data.profile) {
      return NextResponse.json({
        success: false,
        error: { message: "OCS reseller, account, and access settings are required for this user type." },
      }, { status: 400 });
    }

    const profile = needsProfile && parsed.data.profile
      ? await upsertSubresellerProfile({
          ...parsed.data.profile,
          adminEmail: parsed.data.email,
          notes: parsed.data.profile.notes ?? `${parsed.data.role} account`,
        })
      : null;

    const user = await createAdminUser(parsed.data);
    return NextResponse.json({ success: true, data: { user, profile } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Unable to create admin account." },
    }, { status: 400 });
  }
}

function unauthorized() {
  return NextResponse.json({ success: false, error: { message: "Admin session required." } }, { status: 401 });
}
