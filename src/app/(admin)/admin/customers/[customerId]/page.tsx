import { AdminDetailPage } from "@/components/admin/admin-detail-page";
import { getCustomersWorkspaceConfig } from "@/server/stripe/live-data";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const config = await getCustomersWorkspaceConfig();
  return <AdminDetailPage config={config} recordId={customerId} backHref="/admin/customers" />;
}
