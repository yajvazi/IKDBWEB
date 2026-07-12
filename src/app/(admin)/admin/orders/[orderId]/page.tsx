import { AdminDetailPage } from "@/components/admin/admin-detail-page";
import { getOrdersWorkspaceConfig } from "@/server/db/admin-live-data";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const config = await getOrdersWorkspaceConfig();
  return <AdminDetailPage config={config} recordId={orderId} backHref="/admin/orders" />;
}
