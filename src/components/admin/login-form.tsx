"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toastify";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@internetkudo.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Login failed.");

      const next = searchParams.get("next");
      const target = next?.startsWith("/admin") && next !== "/admin/login" ? next : "/admin/dashboard";
      window.location.replace(target);
    } catch (loginError) {
      showToast(loginError instanceof Error ? loginError.message : "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl shadow-slate-950/5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Image src="/branding/internetkudo-logo.svg" alt="InternetKudo" width={168} height={36} priority />
          <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-950">Admin access required</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to manage InternetKudo operations, OCS tools, Stripe payments, and protected admin data.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-900 outline-none ring-primary/20 transition focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-900 outline-none ring-primary/20 transition focus:ring-4"
            />
          </label>

          <Button type="submit" className="h-11 w-full" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
