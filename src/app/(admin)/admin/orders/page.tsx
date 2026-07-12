import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getOrdersWorkspaceConfig } from "@/server/db/admin-live-data";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ search?: string; starting_after?: string }> }) {
  const { search = "", starting_after: startingAfter } = await searchParams;
  const config = await getOrdersWorkspaceConfig({ startingAfter });
  return <AdminWorkspace key={search} config={config} detailBasePath="/admin/orders" initialQuery={search} />;
}
