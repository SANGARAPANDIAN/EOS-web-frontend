import Link from "next/link";
import { getModuleConfig } from "@/modules/registry";

interface AccessDeniedProps {
  role: string;
}

/** Shown by a module shell when a logged-in user's role isn't allowed into that module. */
export function AccessDenied({ role }: AccessDeniedProps) {
  const moduleConfig = getModuleConfig(role);
  const homeHref = moduleConfig ? `${moduleConfig.basePath}/dashboard` : "/login";

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">Oh my god.</h1>
      <p className="max-w-sm text-base text-muted">
        You don&apos;t have permission to be here. Whatever this is, it&apos;s not for you.
      </p>
      <Link
        href={homeHref}
        className="mt-2 rounded-input bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        Take me back
      </Link>
    </div>
  );
}
