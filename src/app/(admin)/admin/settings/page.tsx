import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { AdminAccountManager } from "@/components/admin/admin-account-manager";
import { SubresellerSettings } from "@/components/admin/subreseller-settings";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getSettingsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { admin } = await requireAdminPageAccess("settings");
  const { search = "" } = await searchParams;
  const config = await getSettingsWorkspaceConfig();
  return (
    <div className="space-y-5">
      <AdminAccountManager />
      {admin.role === "super_admin" ? <SubresellerSettings /> : null}
      <AdminWorkspace key={search} config={config} initialQuery={search} />
    </div>
  );
}
