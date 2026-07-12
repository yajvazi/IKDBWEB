import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "ik_admin_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    if (request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/")) {
    if (pathname === "/api/admin/auth/login") return NextResponse.next();
    if (!request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
      return NextResponse.json({ success: false, error: { message: "Admin session required." } }, { status: 401 });
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

