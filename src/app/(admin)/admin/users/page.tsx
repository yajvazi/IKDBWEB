import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getAdminUsersWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getAdminUsersWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
