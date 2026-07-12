import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: { message: "Admin session required." } }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: { admin } });
}

