import { requireAdminPageAccess } from "@/server/auth/admin-access";

export default async function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageAccess("api-docs");
  return children;
}
