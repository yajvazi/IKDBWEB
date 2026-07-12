import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getEsimsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function EsimsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getEsimsWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} detailBasePath="/admin/esims" initialQuery={search} />;
}
