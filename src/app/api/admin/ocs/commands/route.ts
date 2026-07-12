import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ocsCommandCatalog, ocsCommandGroups } from "@/lib/ocs/catalog";
import { getCurrentAdmin } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: { message: "Admin session required." } }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: {
      groups: ocsCommandGroups,
      commands: ocsCommandCatalog,
      note: "Documented OCS command catalog only. Raw OCS command execution is not exposed.",
    },
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
  });
}
