import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { AdminAccountManager } from "@/components/admin/admin-account-manager";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getAdminUsersWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("admin-users");

  const { search = "" } = await searchParams;
  const config = await getAdminUsersWorkspaceConfig();
  return (
    <div className="space-y-5">
      <AdminAccountManager />
      <AdminWorkspace key={search} config={config} initialQuery={search} />
    </div>
  );
}
