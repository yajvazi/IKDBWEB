import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getWebhookWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function WebhooksPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  await requireAdminPageAccess("webhooks");

  const { search = "" } = await searchParams;
  const config = await getWebhookWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
