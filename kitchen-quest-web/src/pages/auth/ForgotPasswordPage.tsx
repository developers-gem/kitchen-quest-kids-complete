import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../../api/auth";
import { getErrorMessage } from "../../lib/errors";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // The backend always responds success here regardless of whether the
      // email is registered (avoids leaking account existence) -- so the
      // UI shows the same confirmation either way, by design.
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Kitchen Quest Kids</p>
          <h1 className="mt-1 text-3xl font-black text-foreground">Reset your password</h1>
        </div>

        <div className="rounded-3xl bg-surface p-8 shadow-sm">
          {submitted ? (
            <p role="status" className="text-center text-foreground/80">
              If that email is registered, we've sent a link to reset your password. Check your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="email" className="text-sm font-semibold text-foreground/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                {submitting ? "Sending..." : "Send reset link"}
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
