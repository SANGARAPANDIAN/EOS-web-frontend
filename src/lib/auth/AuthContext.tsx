"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
      setSessionState(null);
      setStatus("unauthenticated");
      router.replace("/login");
    }
    authEvents.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => authEvents.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiClient.post<LoginResponse>("/auth/login", { email, password });
    const newSession: Session = { accessToken: result.accessToken, user: result.user };
    setSession(newSession);
    setSessionState(newSession);
    setStatus("authenticated");
    return newSession;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

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
