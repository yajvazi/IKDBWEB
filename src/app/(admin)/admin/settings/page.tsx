import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { AdminAccountManager } from "@/components/admin/admin-account-manager";
import { getSettingsWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getSettingsWorkspaceConfig();
  return (
    <div className="space-y-5">
      <AdminAccountManager />
      <AdminWorkspace key={search} config={config} initialQuery={search} />
    </div>
  );
}
