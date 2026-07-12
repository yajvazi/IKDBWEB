import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoles, createAdminUser, getCurrentAdmin, listAdminUsers } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(adminRoles),
  password: z.string().min(10),
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
    const user = await createAdminUser(parsed.data);
    return NextResponse.json({ success: true, data: { user } }, { status: 201 });
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

