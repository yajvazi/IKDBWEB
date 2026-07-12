import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { getPaymentsWorkspaceConfig } from "@/server/stripe/live-data";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ starting_after?: string; search?: string }> }) {
  const { starting_after: startingAfter, search = "" } = await searchParams;
  const config = await getPaymentsWorkspaceConfig({ startingAfter });
  return <AdminWorkspace key={`${startingAfter ?? ""}:${search}`} config={config} initialQuery={search} />;
}
