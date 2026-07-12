import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, destroyAdminSession } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await destroyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

