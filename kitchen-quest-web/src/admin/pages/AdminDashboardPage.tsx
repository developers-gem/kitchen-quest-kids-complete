import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardOverview } from "../api/adminDashboard";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { getErrorMessage } from "../../lib/errors";

function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-neutral-400">{sublabel}</p>}
    </div>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: getAdminDashboardOverview,
  });

  if (isLoading) return <LoadingState label="Loading platform stats..." />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black">Platform Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={data.totalUsers} />
        <StatCard label="Families" value={data.totalFamilies} />
        <StatCard label="Child Profiles" value={data.totalChildProfiles} />
        <StatCard
          label="Active Users"
          value={data.activeUsers.childProfilesActiveLast7Days}
          sublabel="Children active in the last 7 days"
        />
        <StatCard label="Games Completed" value={data.gamesCompletedTotal} sublabel="All-time" />
        <StatCard label="Recipes Completed" value={data.recipesCompletedTotal} sublabel="All-time" />
        <StatCard
          label="Active Parent Accounts"
          value={data.activeUsers.parentAccountsActiveLast30Days}
          sublabel="Logged in within 30 days"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-bold">Popular Games</h2>
          {data.popularContent.topGames.length === 0 ? (
            <p className="text-sm text-neutral-400">No games completed yet.</p>
          ) : (
            <ol className="space-y-2">
              {data.popularContent.topGames.map((g, i) => (
                <li key={g._id} className="flex items-center justify-between text-sm">
                  <span>
                    {i + 1}. {g.title} <span className="text-neutral-400">({g.gameType})</span>
                  </span>
                  <span className="font-bold">{g.completions} completions</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 font-bold">Popular Recipes</h2>
          {data.popularContent.topRecipes.length === 0 ? (
            <p className="text-sm text-neutral-400">No recipes completed yet.</p>
          ) : (
            <ol className="space-y-2">
              {data.popularContent.topRecipes.map((r, i) => (
                <li key={r._id} className="flex items-center justify-between text-sm">
                  <span>
                    {i + 1}. {r.title}
                  </span>
                  <span className="font-bold">{r.completions} completions</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
