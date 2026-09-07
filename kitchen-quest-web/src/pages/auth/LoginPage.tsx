import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/errors";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setError(null);

  const cleanEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    setError("Please enter a valid email address.");
    return;
  }

  if (!password) {
    setError("Password is required.");
    return;
  }

  setSubmitting(true);
  try {
    await login(cleanEmail, password);
    navigate(redirectTo, { replace: true });
  } catch (err) {
    setError(getErrorMessage(err, "Couldn't log in with that email and password."));
  } finally {
    setSubmitting(false);
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Kitchen Quest Kids</p>
          <h1 className="mt-1 text-3xl font-black text-foreground">Welcome back</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-surface p-8 shadow-sm" noValidate>
          <div>
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
          </div>

          <div className="mt-4">
            <label htmlFor="password" className="text-sm font-semibold text-foreground/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

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
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create a parent account
          </Link>
        </p>
      </div>
    </div>
  );
}
