import { AdminDetailPage } from "@/components/admin/admin-detail-page";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getEsimsWorkspaceConfig } from "@/server/db/admin-live-data";

export default async function EsimDetailPage({ params }: { params: Promise<{ esimId: string }> }) {
  await requireAdminPageAccess("esims");

  const { esimId } = await params;
  const config = await getEsimsWorkspaceConfig();
  return <AdminDetailPage config={config} recordId={esimId} backHref="/admin/esims" />;
}
