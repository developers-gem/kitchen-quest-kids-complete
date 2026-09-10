import { useState } from "react";
import { Link } from "react-router-dom";

export function DeleteAccountPage() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    if (errorMessage) setErrorMessage(null);
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMessage("Please enter your parent email address.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    // In dev: Vite proxies /api/v1 to Render (bypassing CORS)
    // In prod: uses full VITE_API_BASE_URL if configured, otherwise falls back to relative path
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
    const endpoint = apiBase ? `${apiBase}/api/v1/delete-account` : "/api/v1/delete-account";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error?.message || data?.message || `Server returned error (${res.status})`
        );
      }

      setStatusMessage(
        data?.data?.message || "Account deletion request processed successfully."
      );
      setEmail("");
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to contact server. Please verify your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-surface border border-foreground/10 rounded-3xl p-6 sm:p-10 shadow-sm">
        {/* Navigation */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-6"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl sm:text-4xl">⚠️</span>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Delete Family Account
            </h1>
            <p className="text-xs text-foreground/60">
              Kitchen Quest Kids • Permanent Action
            </p>
          </div>
        </div>

        {/* Informational Consequences Banner */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-bold text-rose-600 mb-2 flex items-center gap-1.5">
            <span>🛑</span> What happens when you delete your account:
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs text-rose-700 dark:text-rose-400">
            <li>All associated child chef profiles will be permanently removed.</li>
            <li>All earned XP, culinary streaks, badges, and avatars will be wiped.</li>
            <li>Saved grocery checklists and completed recipe logs will be purged.</li>
            <li>Live database records are detached immediately upon request.</li>
          </ul>
        </div>

        {/* Feedback Messages */}
        {statusMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-semibold">
            ✅ {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-semibold">
            ❌ {errorMessage}
          </div>
        )}

        {/* Submission Form */}
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div>
            <label
              htmlFor="parent-email"
              className="block text-sm font-semibold text-foreground mb-1.5"
            >
              Confirm Parent Email Address
            </label>
            <p className="text-xs text-foreground/60 mb-2">
              Enter the parent email address associated with this account to confirm deletion.
            </p>
            <input
              id="parent-email"
              type="email"
              required
              disabled={loading}
              placeholder="parent@example.com"
              value={email}
              onChange={handleEmailInputChange}
              className="w-full rounded-2xl border border-foreground/20 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-rose-500 focus:outline-hidden transition-colors disabled:opacity-50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full min-h-12 rounded-full bg-rose-600 font-bold text-white shadow-sm hover:bg-rose-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing Deletion..." : "Permanently Delete Account"}
            </button>
          </div>
        </form>

        {/* Alternative Support Notice */}
        <p className="text-xs text-foreground/50 text-center mt-6">
          Need help or prefer manual deletion? Email{" "}
          <a
            href="mailto:privacy@kitchenquestkids.com"
            className="text-primary underline"
          >
            privacy@kitchenquestkids.com
          </a>
        </p>
      </div>
    </div>
  );
}