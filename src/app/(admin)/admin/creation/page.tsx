import { CreationPanel } from "@/components/admin/creation-panel";
import { requireAdminPageAccess } from "@/server/auth/admin-access";

export const dynamic = "force-dynamic";

export default async function CreationPage() {
  const { admin, policy } = await requireAdminPageAccess("creation");
  const accessScope = admin.role === "super_admin" || !policy
    ? null
    : {
        resellerId: policy.ocsResellerId,
        accountId: policy.ocsAccountId,
        resellerName: policy.resellerName,
      };

  return <CreationPanel resellerId={String(accessScope?.resellerId ?? process.env.OCS_RESELLER_ID ?? "567")} accessScope={accessScope} />;
}
