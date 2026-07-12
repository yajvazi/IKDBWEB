import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getCustomersWorkspaceConfig } from "@/server/stripe/live-data";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ starting_after?: string; search?: string }> }) {
  const { starting_after: startingAfter, search = "" } = await searchParams;
  const config = await getCustomersWorkspaceConfig({ startingAfter });
  return <AdminWorkspace key={`${startingAfter ?? ""}:${search}`} config={config} detailBasePath="/admin/customers" initialQuery={search} />;
}
