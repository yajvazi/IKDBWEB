import { AdminDetailPage } from "@/components/admin/admin-detail-page";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getOrdersWorkspaceConfig } from "@/server/db/admin-live-data";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireAdminPageAccess("orders");

  const { orderId } = await params;
  const config = await getOrdersWorkspaceConfig();
  return <AdminDetailPage config={config} recordId={orderId} backHref="/admin/orders" />;
}
