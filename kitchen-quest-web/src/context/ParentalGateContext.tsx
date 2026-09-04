import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { getGateToken, setGateToken } from "../api/gateTokenStore";

/**
 * Usage pattern: `const { ensureGate } = useParentalGate(); const ok =
 * await ensureGate(); if (!ok) return;` -- any component that's about to
 * call a gated endpoint (create/edit/delete a child, view the parent
 * dashboard, verify a recipe) calls this first. If a still-valid gate
 * token already exists, it resolves immediately with no UI shown. If not,
 * it renders the challenge modal and resolves once the parent answers (or
 * false if they cancel).
 *
 * This context OWNS the modal's visibility, so callers never have to
 * manage a "showGateModal" boolean themselves -- one context, one modal
 * instance mounted near the app root, imperatively triggered from
 * anywhere.
 */

interface ParentalGateContextValue {
  ensureGate: () => Promise<boolean>;
}

const ParentalGateContext = createContext<ParentalGateContextValue | undefined>(undefined);

export function ParentalGateProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const loadChallenge = useCallback(async () => {
    setError(null);
    try {
      const challenge = await authApi.requestParentalGateChallenge();
      setQuestion(challenge.question);
      setChallengeToken(challenge.challengeToken);
    } catch {
      setError("Couldn't load the check. Please try again.");
    }
  }, []);

  const ensureGate = useCallback((): Promise<boolean> => {
    if (getGateToken()) return Promise.resolve(true);
    setIsOpen(true);
    setAnswer("");
    void loadChallenge();
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [loadChallenge]);

  function close(result: boolean) {
    setIsOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeToken || answer === "") return;
    setSubmitting(true);
    setError(null);
    try {
      const { gateToken } = await authApi.verifyParentalGate(challengeToken, Number(answer));
      setGateToken(gateToken);
      close(true);
    } catch {
      setError("That's not quite right -- try again.");
      setAnswer("");
      void loadChallenge();
    } finally {
      setSubmitting(false);
    }
  }

  const value = useMemo(() => ({ ensureGate }), [ensureGate]);

  return (
    <ParentalGateContext.Provider value={value}>
      {children}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="parental-gate-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Grown-ups only</p>
            <h2 id="parental-gate-title" className="mt-1 text-2xl font-black text-foreground">
              Quick check
            </h2>
            <p className="mt-2 text-sm text-foreground/70">Solve this to continue.</p>

            <div className="mt-6 rounded-2xl bg-foreground/5 p-6 text-center" aria-live="polite">
              <span className="text-3xl font-black tabular-nums text-foreground">{question ?? "..."}</span>
            </div>

            <label htmlFor="parental-gate-answer" className="sr-only">
              Your answer
            </label>
            <input
              id="parental-gate-answer"
              autoFocus
              inputMode="numeric"
              type="number"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer"
              className="mt-4 w-full min-h-11 rounded-full border border-foreground/10 px-5 py-3 text-center text-lg outline-none focus:border-primary"
            />

            {error && (
              <p role="alert" className="mt-3 text-center text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="min-h-11 flex-1 rounded-full border border-foreground/10 py-3 font-semibold text-foreground/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!challengeToken || submitting || answer === ""}
                className="min-h-11 flex-1 rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40"
              >
                {submitting ? "Checking..." : "Continue"}
              </button>
            </div>
          </form>
        </div>
      )}
    </ParentalGateContext.Provider>
  );
}

export function useParentalGate(): ParentalGateContextValue {
  const ctx = useContext(ParentalGateContext);
  if (!ctx) throw new Error("useParentalGate must be used within a ParentalGateProvider");
  return ctx;
}
