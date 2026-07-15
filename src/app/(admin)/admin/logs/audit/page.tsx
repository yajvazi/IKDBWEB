import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getAuditLogsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("audit-logs");

  const { search = "" } = await searchParams;
  const config = await getAuditLogsWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
