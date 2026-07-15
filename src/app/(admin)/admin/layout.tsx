import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentAdminAccess } from "@/server/auth/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, allowedPageKeys } = await getCurrentAdminAccess();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <AdminSidebar allowedPageKeys={allowedPageKeys} />
        <div className="min-w-0 flex-1">
          <AdminHeader admin={admin} />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
