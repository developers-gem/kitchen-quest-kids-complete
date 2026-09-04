import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as authApi from "../../api/auth";
import { getErrorMessage } from "../../lib/errors";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(getErrorMessage(err, "That reset link is invalid or has expired."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Kitchen Quest Kids</p>
          <h1 className="mt-1 text-3xl font-black text-foreground">Choose a new password</h1>
        </div>

        <div className="rounded-3xl bg-surface p-8 shadow-sm">
          {done ? (
            <p role="status" className="text-center text-foreground/80">
              Password updated! Taking you to log in...
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="password" className="text-sm font-semibold text-foreground/70">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-3 outline-none focus:border-primary"
              />

              <label htmlFor="confirmPassword" className="mt-4 block text-sm font-semibold text-foreground/70">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-3 outline-none focus:border-primary"
              />

              {error && (
                <p role="alert" className="mt-4 text-sm font-semibold text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save new password"}
              </button>
            </form>
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
