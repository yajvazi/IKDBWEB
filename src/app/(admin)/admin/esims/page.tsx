import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getEsimsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function EsimsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("esims");

  const { search = "" } = await searchParams;
  const config = await getEsimsWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} detailBasePath="/admin/esims" initialQuery={search} />;
}
