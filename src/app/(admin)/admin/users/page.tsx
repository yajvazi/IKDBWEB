import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getAdminUsersWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("admin-users");

  const { search = "" } = await searchParams;
  const config = await getAdminUsersWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
