"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";
import { Button, Input } from "@/components/ui";
import { ApiError } from "@/types/api";

export default function LoginPage() {
  const { login, session, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session) {
      const moduleConfig = getModuleConfig(session.user.role);
      router.replace(moduleConfig ? `${moduleConfig.basePath}/dashboard` : "/login");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const newSession = await login(email, password);
      const moduleConfig = getModuleConfig(newSession.user.role);
      if (!moduleConfig) {
        setError(`The "${newSession.user.role}" portal isn't available yet.`);
        return;
      }
      router.replace(`${moduleConfig.basePath}/dashboard`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-input px-4 font-sans">
      <div className="w-full max-w-[400px] animate-pop-in rounded-card border border-border-default bg-surface p-8 shadow-tab">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Image src="/college-logo.png" alt="College logo" width={48} height={48} priority className="object-contain" />
          <div>
            <div className="text-lg font-extrabold tracking-[-.02em] text-ink">Sri Eshwar</div>
            <div className="text-[11px] font-semibold text-muted">College of Engineering</div>
          </div>
        </div>

        <h1 className="mb-1 text-xl font-extrabold tracking-[-.02em] text-ink">Sign in</h1>
        <p className="mb-6 text-[13px] text-muted">Use your college-issued email and password.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-bold text-muted" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
