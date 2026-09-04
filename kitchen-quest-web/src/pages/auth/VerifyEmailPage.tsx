import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as authApi from "../../api/auth";
import { getErrorMessage } from "../../lib/errors";

/**
 * FIXED (production readiness audit, finding B1): this page didn't exist
 * at all -- the verification email's link had nowhere real to send a
 * user. The API client function (authApi.verifyEmail) was already built
 * and unused; this page is what was missing to complete the loop.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token. Please request a new one.");
      return;
    }
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setError(getErrorMessage(err, "That verification link is invalid or has expired."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Kitchen Quest Kids</p>
          <h1 className="mt-1 text-3xl font-black text-foreground">Verify your email</h1>
        </div>

        <div className="rounded-3xl bg-surface p-8 text-center shadow-sm">
          {status === "verifying" && <p className="text-foreground/70">Verifying...</p>}
          {status === "success" && (
            <p role="status" className="text-foreground/80">
              Your email is verified! You're all set.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="font-semibold text-danger">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-foreground/60">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
