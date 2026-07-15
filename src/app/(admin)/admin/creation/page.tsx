import { CreationPanel } from "@/components/admin/creation-panel";
import { requireAdminPageAccess } from "@/server/auth/admin-access";

export const dynamic = "force-dynamic";

export default async function CreationPage() {
  await requireAdminPageAccess("creation");

  return <CreationPanel resellerId={process.env.OCS_RESELLER_ID ?? "567"} />;
}
