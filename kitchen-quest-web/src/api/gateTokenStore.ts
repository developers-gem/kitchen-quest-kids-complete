/**
 * The parental-gate token (from POST /auth/parental-gate/verify) follows
 * the same "in-memory only, module-level store" pattern as tokenStore.ts,
 * kept as a separate store because it has an entirely different lifecycle:
 * it's short-lived (~15 min per the backend), scoped to "an adult is
 * currently present," and cleared proactively on navigation away from any
 * parent-only screen -- not tied to the login session the way the access
 * token is.
 */

type Listener = () => void;

let gateToken: string | null = null;
let expiresAt: number | null = null;
const listeners = new Set<Listener>();

const GATE_TOKEN_TTL_MS = 14 * 60 * 1000; // slightly under the backend's 15m, to refresh proactively

export function getGateToken(): string | null {
  if (expiresAt && Date.now() > expiresAt) {
    gateToken = null;
    expiresAt = null;
  }
  return gateToken;
}

export function setGateToken(token: string | null): void {
  gateToken = token;
  expiresAt = token ? Date.now() + GATE_TOKEN_TTL_MS : null;
  listeners.forEach((l) => l());
}

export function clearGateToken(): void {
  setGateToken(null);
}

export function subscribeGateToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
