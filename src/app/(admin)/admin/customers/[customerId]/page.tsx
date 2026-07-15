import { AdminDetailPage } from "@/components/admin/admin-detail-page";
import { requireAdminPageAccess } from "@/server/auth/admin-access";
import { getCustomersWorkspaceConfig } from "@/server/stripe/live-data";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  await requireAdminPageAccess("customers");

  const { customerId } = await params;
  const config = await getCustomersWorkspaceConfig();
  return <AdminDetailPage config={config} recordId={customerId} backHref="/admin/customers" />;
}
