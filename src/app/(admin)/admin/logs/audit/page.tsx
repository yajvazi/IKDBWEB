import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getAuditLogsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getAuditLogsWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
