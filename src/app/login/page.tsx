"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";
import { Button, Icon, Input } from "@/components/ui";
import { ApiError } from "@/types/api";

export default function LoginPage() {
  const { login, session, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="flex min-h-screen flex-col font-sans">
      <header className="bg-gradient-to-r from-primary-dark via-primary to-primary-cta px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Image
            src="/college-logo.png"
            alt="College logo"
            width={48}
            height={48}
            priority
            className="h-12 w-12 shrink-0 object-contain"
          />
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-white sm:text-xl">
              Sri Eshwar College of Engineering
            </h1>
            <p className="text-xs font-semibold tracking-[.08em] text-white/80">LEADERSHIP &amp; EXCELLENCE</p>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center bg-surface">
        <Image src="/login-hero.png" alt="" fill priority className="object-cover object-bottom opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/20 to-surface/50" />

        <div className="relative flex w-full max-w-7xl flex-col items-center justify-center gap-12 px-6 py-14 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div className="lg:flex-1">
            <p className="text-lg font-semibold text-body">Welcome to</p>
            <h2 className="text-4xl font-extrabold tracking-[-.02em] text-primary sm:text-5xl">EOS Portal</h2>
            <span className="mt-4 block h-1 w-16 rounded-full bg-primary" />
            <p className="mt-5 max-w-md text-sm leading-6 text-muted">
              A unified platform to streamline academic, administrative and communication processes for students,
              faculty, parents and staff.
            </p>
          </div>

          <div className="flex w-full justify-center lg:w-auto lg:flex-1 lg:justify-end">
            <div className="w-full max-w-md animate-pop-in rounded-card border border-border-default bg-surface p-8 shadow-tab sm:p-10">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-primary">
                  <Icon name="lock" size={26} />
                </span>
                <h1 className="mt-4 text-xl font-extrabold tracking-[-.02em] text-ink">Sign in to your account</h1>
                <p className="mt-1 text-sm text-muted">Use your college-issued email and password.</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                {error && (
                  <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                    {error}
                  </div>
                )}

                <label className="relative block">
                  <span className="sr-only">Email</span>
                  <Icon
                    name="mail"
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
                  />
                  <Input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="pl-10"
                  />
                </label>

                <label className="relative block">
                  <span className="sr-only">Password</span>
                  <Icon
                    name="lock"
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle"
                  />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-muted"
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
                  </button>
                </label>

                <label className="flex items-center gap-2 text-[13px] text-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-border-default text-primary focus:ring-border-accent"
                  />
                  Remember me
                </label>

                <Button type="submit" disabled={submitting} className="mt-1">
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-primary-dark px-6 py-4 text-xs text-white/80 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
          <p>&copy; 2026 Sri Eshwar College of Engineering. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Icon name="support_agent" size={15} />
              Need help? Contact ERP Support
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="mail" size={15} />
              erp@sece.ac.in
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
