"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { authEvents, UNAUTHORIZED_EVENT } from "@/lib/auth/authEvents";
import { clearSession, getSession, setSession, type Session, type SessionUser } from "@/lib/auth/session";

interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  session: Session | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this initial read can't move
    // into a useState lazy initializer without risking a hydration mismatch
    // (server would render "unauthenticated" even when a session exists) —
    // it has to run once on the client after mount.
    const existing = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionState(existing);
    setStatus(existing ? "authenticated" : "unauthenticated");
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      queryClient.clear();
      setSessionState(null);
      setStatus("unauthenticated");
      router.replace("/login");
    }
    authEvents.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => authEvents.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router, queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiClient.post<LoginResponse>("/auth/login", { email, password });
      const newSession: Session = { accessToken: result.accessToken, user: result.user };
      setSession(newSession);
      // Belt-and-braces alongside logout()'s own clear: a stale cache can
      // still be sitting here even when this login wasn't preceded by our
      // own logout flow in this same browser tab (e.g. the previous
      // session's token was cleared some other way without a full reload,
      // so the in-memory query client never got wiped). Clearing again here
      // guarantees a newly-authenticated identity never renders — or
      // queries against — data cached under a different account's ids.
      queryClient.clear();
      setSessionState(newSession);
      setStatus("authenticated");
      return newSession;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearSession();
    // Without this, another account's cached data (class lists, dashboard
    // figures, wallet balance, ...) survives in the persisted React Query
    // cache and briefly renders — or gets queried against — for whoever
    // logs in next on this browser, since query keys aren't scoped by user.
    queryClient.clear();
    setSessionState(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, status, login, logout }),
    [session, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
