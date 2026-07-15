import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getOcsPackagesWorkspaceConfig } from "@/server/ocs/packages";

export const dynamic = "force-dynamic";

export default async function PackagesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("packages");

  const { search = "" } = await searchParams;
  const config = await getOcsPackagesWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
