import { AdminHelpCenter } from "@/components/admin/admin-help-center";
import { requireAdminPageAccess } from "@/server/auth/admin-access";

export const dynamic = "force-dynamic";

export default async function HelpCenterPage() {
  await requireAdminPageAccess("help");
  return <AdminHelpCenter />;
}
