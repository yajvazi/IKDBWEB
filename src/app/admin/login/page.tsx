import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/server/auth/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin/dashboard");

  return <LoginForm />;
}

