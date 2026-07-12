import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getOcsPackagesWorkspaceConfig } from "@/server/ocs/packages";

export const dynamic = "force-dynamic";

export default async function PackagesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getOcsPackagesWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
