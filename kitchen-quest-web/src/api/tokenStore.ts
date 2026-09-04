/**
 * Holds the in-memory access token and the refresh function, outside of
 * React state. Two reasons this isn't just "a value in AuthContext":
 *
 * 1. The low-level API client (client.ts) needs to read the current token
 *    on every request and, on a 401, call refresh -- but the client is a
 *    plain module, not a component, and can't call useContext().
 * 2. The access token deliberately never touches localStorage/sessionStorage
 *    (that's an XSS exfiltration surface) -- it lives only in memory for
 *    the life of the tab, matching the auth architecture's design. This
 *    store IS that memory.
 *
 * AuthContext is the only thing that ever calls `setAccessToken`/`setUser`;
 * everything else (the API client, route guards) only reads.
 */

type Listener = () => void;

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let refreshFn: (() => Promise<string | null>) | null = null;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((l) => l());
}

/** Registered once by AuthContext with the real POST /auth/refresh call. */
export function registerRefreshFn(fn: () => Promise<string | null>): void {
  refreshFn = fn;
}

/** De-duplicates concurrent refresh attempts: if three requests 401 at
 * once, only one refresh call goes out, and all three await its result. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshFn) return Promise.resolve(null);
  if (!refreshInFlight) {
    refreshInFlight = refreshFn().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
