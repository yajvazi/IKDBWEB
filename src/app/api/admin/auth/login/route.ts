import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, authenticateAdmin } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { message: "Email and password are required." } }, { status: 400 });
  }

  const result = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!result) {
    return NextResponse.json({ success: false, error: { message: "Invalid admin email or password." } }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, data: { admin: result.user } });
  response.cookies.set(ADMIN_SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}

