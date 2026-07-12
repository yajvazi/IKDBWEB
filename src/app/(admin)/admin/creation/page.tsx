import { CreationPanel } from "@/components/admin/creation-panel";

export const dynamic = "force-dynamic";

export default function CreationPage() {
  return <CreationPanel resellerId={process.env.OCS_RESELLER_ID ?? "567"} />;
}
