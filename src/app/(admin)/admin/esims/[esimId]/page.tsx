import { AdminDetailPage } from "@/components/admin/admin-detail-page";
import { getEsimsWorkspaceConfig } from "@/server/db/admin-live-data";

export default async function EsimDetailPage({ params }: { params: Promise<{ esimId: string }> }) {
  const { esimId } = await params;
  const config = await getEsimsWorkspaceConfig();
  return <AdminDetailPage config={config} recordId={esimId} backHref="/admin/esims" />;
}
