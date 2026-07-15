import "server-only";

import { redirect } from "next/navigation";
import type { AdminPageKey } from "@/lib/admin/pages";
import { getAdminAccessPolicy } from "@/server/db/subresellers";
import { requireCurrentAdmin } from "@/server/auth/admin-auth";

export async function getCurrentAdminAccess() {
  const admin = await requireCurrentAdmin();
  if (admin.role === "super_admin") return { admin, policy: null, allowedPageKeys: null };

  const policy = await getAdminAccessPolicy(admin.email);
  return {
    admin,
    policy,
    allowedPageKeys: policy?.allowedDashboardPages?.length ? policy.allowedDashboardPages : ["dashboard" as AdminPageKey],
  };
}

export async function requireAdminPageAccess(pageKey: AdminPageKey) {
  const { admin, policy } = await getCurrentAdminAccess();
  if (pageKey === "help") return { admin, policy };
  if (admin.role === "super_admin") return { admin, policy };

  if (!policy) {
    if (pageKey !== "dashboard") redirect("/admin/dashboard");
    return { admin, policy };
  }

  if (!policy.allowedDashboardPages.includes(pageKey)) {
    const fallback = policy.allowedDashboardPages[0] ?? "dashboard";
    redirect(`/admin/${fallback}`);
  }

  return { admin, policy };
}
