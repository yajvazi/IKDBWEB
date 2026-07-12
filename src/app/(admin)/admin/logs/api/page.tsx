import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getApiLogsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function ApiLogsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getApiLogsWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
