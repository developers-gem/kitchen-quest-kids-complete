// import { Link } from "react-router-dom";
import { useState } from "react";
export function DeleteAccountPage() {

    const [email, setEmail] = useState<string>("");
    const handleEmailInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(event.target.value);
    }

    const handleDeleteAccount = async () => {
        // Implement the logic to delete the account here
        console.log("Deleting account for email:", email);
        const res = await fetch("http://localhost:4000/api/v1/users/delete-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        })
        if (!res.ok) {
            console.error("Failed to delete account:", res.statusText);
        }
    }
    console.log(email);
    return (
        <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="w-full max-w-xl bg-surface border border-foreground/10 rounded-3xl p-6 sm:p-10 shadow-sm">
                {/* Navigation Link */}
                {/* <Link
          to="/parent"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline mb-6"
        >
          ← Back to Parent Dashboard
        </Link> */}

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

                {/* Warning Information Banner */}
                {/* <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6">
          <h2 className="text-sm font-bold text-rose-600 mb-2 flex items-center gap-1.5">
            <span>🛑</span> What happens when you delete your account:
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs text-rose-700 dark:text-rose-400">
            <li>All associated child chef profiles will be permanently removed.</li>
            <li>All earned XP, culinary streaks, badges, and avatars will be wiped.</li>
            <li>Saved grocery checklists and completed recipe logs will be purged.</li>
            <li>Live database records are detached and fully erased within 48 hours.</li>
            <li>Rolling backups will expire and clear all residual data within 30 days.</li>
          </ul>
        </div> */}

                {/* Static Form Container */}
                <div className="space-y-4">
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
                            placeholder="parent@example.com"
                            value={email}
                            onChange={handleEmailInputChange}
                            className="w-full rounded-2xl border border-foreground/20 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-rose-500 focus:outline-hidden transition-colors"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="button"
                            className="w-full min-h-12 rounded-full bg-rose-600 font-bold text-white shadow-sm hover:bg-rose-700 active:scale-98 transition-all"
                            onClick={handleDeleteAccount}
                        >
                            Permanently Delete Account
                        </button>
                    </div>
                </div>

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