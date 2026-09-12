"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { auth, admin, systemSettings } from "./api";
import { ROLE_HOME } from "@/hooks/useLoginForm";

interface User {
  id: number;
  email: string;
  role: string;
}

/** The account that signed in as `user` via admin impersonation, if any. */
export interface Impersonator {
  id: number;
  email: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  impersonator: Impersonator | null;
  login: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  impersonateAs: (userId: number) => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

const IMPERSONATOR_KEY = "impersonator";

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function readStoredImpersonator(): Impersonator | null {
  try {
    const raw = localStorage.getItem(IMPERSONATOR_KEY);
    return raw ? (JSON.parse(raw) as Impersonator) : null;
  } catch {
    return null;
  }
}

/** Hard redirect after switching accounts — the shell differs per role. */
function goToRoleHome(role: string, fallback = "/workspace") {
  if (typeof window !== "undefined") {
    window.location.href = ROLE_HOME[role] ?? fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonator, setImpersonator] = useState<Impersonator | null>(null);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    setUser(readStoredUser());
    setImpersonator(readStoredImpersonator());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    const res = await auth.login({ email, password, role });
    const tokens = res.data;

    // Store tokens client-side (httpOnly cookies are also set by the server)
    if (tokens.accessToken) localStorage.setItem("accessToken", tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem("refreshToken", tokens.refreshToken);
    if (tokens.user) {
      localStorage.setItem("user", JSON.stringify(tokens.user));
      setUser(tokens.user);
    }
    // A fresh login is never an impersonated session.
    localStorage.removeItem(IMPERSONATOR_KEY);
    setImpersonator(null);
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem(IMPERSONATOR_KEY);
    setUser(null);
    setImpersonator(null);
    // Redirect to login after signout
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  /** Admin/owner signs in as another account. Fully audited server-side. */
  const impersonateAs = useCallback(async (userId: number) => {
    const res = await admin.impersonate(userId);
    const tokens = res.data;
    if (!tokens.user) return;

    if (tokens.accessToken) localStorage.setItem("accessToken", tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("user", JSON.stringify(tokens.user));
    setUser(tokens.user);

    // Remember who the real account is (used for banner + stop)
    if (tokens.impersonated_by) {
      localStorage.setItem(IMPERSONATOR_KEY, JSON.stringify(tokens.impersonated_by));
      setImpersonator(tokens.impersonated_by);
    }

    goToRoleHome(tokens.user.role, "/workspace");
  }, []);

  /** Leave an impersonated session and restore the original account. */
  const stopImpersonating = useCallback(async () => {
    const res = await auth.stopImpersonation();
    const tokens = res.data;
    if (!tokens.user) return;

    if (tokens.accessToken) localStorage.setItem("accessToken", tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("user", JSON.stringify(tokens.user));
    localStorage.removeItem(IMPERSONATOR_KEY);
    setUser(tokens.user);
    setImpersonator(null);

    goToRoleHome(tokens.user.role, "/admin");
  }, []);

  // Idle session timeout — any logged-in user is signed out after
  // `session_timeout_minutes` of inactivity (0/absent = never).
  useEffect(() => {
    if (!user) return;

    let minutes = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const arm = () => {
      if (timer) clearTimeout(timer);
      if (minutes <= 0) return;
      timer = setTimeout(() => {
        if (disposed) return;
        // Record the inactivity timeout in the audit log, then sign out.
        auth.timeout().catch(() => undefined);
        logout();
      }, minutes * 60 * 1000);
    };

    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    const reset = arm;
    const bind = () => events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const unbind = () => events.forEach((e) => window.removeEventListener(e, reset));

    systemSettings
      .get()
      .then((r) => {
        if (disposed) return;
        const raw = (r.data as Record<string, string>)["session_timeout_minutes"];
        minutes = parseInt(raw ?? "0", 10) || 0;
        if (minutes <= 0) return;
        bind();
        arm();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unbind();
    };
  }, [user?.id, logout]);

  return (
    <AuthContext.Provider value={{ user, loading, impersonator, login, logout, impersonateAs, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  // During SSR/prerender, context is null — return safe defaults
  if (!ctx) {
    return {
      user: null,
      loading: true,
      impersonator: null,
      login: async () => {},
      logout: async () => {},
      impersonateAs: async () => {},
      stopImpersonating: async () => {},
    };
  }
  return ctx;
}
