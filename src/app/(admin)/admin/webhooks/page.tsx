import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getWebhookWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function WebhooksPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const config = await getWebhookWorkspaceConfig();
  return <AdminWorkspace key={search} config={config} initialQuery={search} />;
}
