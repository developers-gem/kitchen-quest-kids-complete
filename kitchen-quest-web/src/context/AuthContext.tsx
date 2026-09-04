import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import * as usersApi from "../api/users";
import { getAccessToken, registerRefreshFn, setAccessToken, subscribe } from "../api/tokenStore";
import type { User } from "../types/api";

/**
 * STATE STRATEGY NOTE (auth slice):
 * This is the one piece of truly global state in the app -- almost
 * everything else the app needs is "server state" fetched per-screen via
 * React Query (see hooks/*.ts), not duplicated into a global store. Auth
 * is the exception because *everything* depends on knowing "is someone
 * logged in, and as whom" before it can render at all.
 *
 * The access token itself does NOT live in this component's React state --
 * it lives in tokenStore.ts (a plain module-level variable) so the
 * non-React API client can read it synchronously on every request without
 * a context lookup. This context subscribes to that store and mirrors its
 * presence into `isAuthenticated` for rendering decisions, and owns the
 * `user` object (which IS fine as React state, since only components read
 * it).
 */

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: authApi.RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // FIXED: this used to track the token's presence as a SEPARATE boolean
  // (`hasToken`) and compute `isAuthenticated: hasToken && Boolean(user)`.
  // During the silent-refresh-on-load flow below, `setAccessToken` and
  // `setUser` fire at different points (there's a real `await
  // usersApi.getMe()` between them) -- so there was a genuine, reproducible
  // render where hasToken=true but user=null, which many other
  // components across the app treat as "not yet authenticated" (e.g. any
  // query with `enabled: isAuthenticated`). That's not just a transient
  // render either: because it flips a query's `enabled` flag from false
  // to a brief false-again to true, components gating real data fetches
  // on `isAuthenticated` saw a spurious extra render cycle, and in
  // testing this manifested as an intermittent-looking but fully
  // reproducible flicker (a "0 children" empty state rendering for one
  // frame before the real list arrived).
  //
  // Fix: `isAuthenticated` now depends on `user` alone -- a fetched user
  // object is the actual ground truth of "we know who's logged in," and
  // every code path that sets a token (login, register, the silent
  // refresh below) also sets `user` shortly after. The remaining
  // responsibility of watching for *external* token invalidation (the
  // API client's own refresh-on-401 clearing the token when a session
  // has truly expired) is handled by clearing `user` in lockstep the
  // moment the token disappears, so a stale `user` object can never
  // outlive the token that was used to fetch it.
  useEffect(
    () =>
      subscribe(() => {
        if (!getAccessToken()) setUser(null);
      }),
    []
  );

  useEffect(() => {
    registerRefreshFn(async () => {
      try {
        const tokens = await authApi.refresh();
        setAccessToken(tokens.accessToken);
        return tokens.accessToken;
      } catch {
        return null;
      }
    });
  }, []);

  // On first load, attempt a silent refresh (the httpOnly cookie may still
  // be valid even though the in-memory access token was wiped by a page
  // reload) so a returning user doesn't have to log in again every time
  // they open the app.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = await authApi.refresh();
        if (cancelled) return;
        setAccessToken(tokens.accessToken);
        const me = await usersApi.getMe();
        if (!cancelled) setUser(me);
      } catch {
        // No valid session -- that's fine, render as logged out.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (input: authApi.RegisterInput) => {
    const res = await authApi.register(input);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await usersApi.getMe();
    setUser(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
