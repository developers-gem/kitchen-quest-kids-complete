import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../lib/errors";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consentAcknowledged) {
      setError("Please confirm you're a parent or guardian creating this account.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        consentAcknowledged: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't create your account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Kitchen Quest Kids</p>
          <h1 className="mt-1 text-3xl font-black text-foreground">Create your family account</h1>
          <p className="mt-2 text-sm text-foreground/60">This account is for parents and guardians.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl bg-surface p-8 shadow-sm" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="text-sm font-semibold text-foreground/70">
                First name
              </label>
              <input
                id="firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-semibold text-foreground/70">
                Last name
              </label>
              <input
                id="lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-3 outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="mt-4">
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
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-hint"
              className="mt-1 min-h-11 w-full rounded-2xl border border-foreground/10 px-4 py-3 outline-none focus:border-primary"
            />
            <p id="password-hint" className="mt-1 text-xs text-foreground/50">
              At least 10 characters, with an uppercase letter, lowercase letter, and a number.
            </p>
          </div>

          <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-foreground/70">
            <input
              type="checkbox"
              checked={consentAcknowledged}
              onChange={(e) => setConsentAcknowledged(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0"
              required
            />
            <span>
              I confirm I'm a parent or legal guardian creating this account for my family, and I agree to the
              privacy policy.
            </span>
          </label>

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
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
