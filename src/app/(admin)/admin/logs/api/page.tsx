import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getApiLogsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function ApiLogsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("api-proxy");

  const { search = "" } = await searchParams;
  const config = await getApiLogsWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
