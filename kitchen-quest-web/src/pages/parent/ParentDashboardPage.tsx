import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { useParentalGate } from "../../context/ParentalGateContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { getErrorMessage } from "../../lib/errors";
import * as dashboardApi from "../../api/parentDashboard";

/**
 * Closes production readiness audit finding A4 (Parent Dashboard was a
 * ComingSoonPage placeholder) using endpoints that were already fully
 * built and tested on the backend (dashboard.service.js) -- this page is
 * new, the API contract behind it is not.
 *
 * Every dashboard endpoint requires the parental gate as a whole (see
 * dashboard.routes.js's router-level requireParentalGate()), so this
 * page gates itself once on mount rather than per-tab -- matching the
 * backend's own "this is one parent-only surface" framing rather than
 * treating each tab as independently sensitive.
 */
const TABS = ["Overview", "Weekly Summary", "Learning Progress", "Activity", "Grocery", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function ParentDashboardPage() {
  const { activeChild, isLoading: isLoadingChildren, children } = useActiveChild();
  const { ensureGate } = useParentalGate();
  const [gateChecked, setGateChecked] = useState(false);
  const [gateDenied, setGateDenied] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    let cancelled = false;
    ensureGate().then((ok) => {
      if (cancelled) return;
      setGateChecked(true);
      setGateDenied(!ok);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoadingChildren || !gateChecked) return <LoadingState label="Loading parent dashboard..." />;

  if (gateDenied) {
    return (
      <EmptyState
        icon="🔒"
        title="Grown-ups only"
        description="You'll need to pass the quick check to view the parent dashboard. Refresh the page to try again."
      />
    );
  }

  if (children.length === 0) {
    return <EmptyState icon="🧑‍🍳" title="No chefs yet!" description="Add a child profile to see their progress here." />;
  }

  if (!activeChild) return <LoadingState />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Parent Dashboard</h1>
        <p className="text-sm text-foreground/60">Viewing {activeChild.displayName}'s progress</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-foreground/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-foreground text-white" : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab childId={activeChild._id} />}
      {tab === "Weekly Summary" && <WeeklySummaryTab childId={activeChild._id} />}
      {tab === "Learning Progress" && <LearningProgressTab childId={activeChild._id} />}
      {tab === "Activity" && <ActivityTab childId={activeChild._id} />}
      {tab === "Grocery" && <GroceryTab />}
      {tab === "Settings" && <SettingsTab />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">{label}</p>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
    </div>
  );
}

function OverviewTab({ childId }: { childId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["parent-dashboard", "overview", childId],
    queryFn: () => dashboardApi.getOverview(childId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total XP" value={data.totalXP} />
        <StatCard label="Current Streak" value={data.currentStreak} />
        <StatCard label="Longest Streak" value={data.longestStreak} />
        <StatCard label="XP This Week" value={data.weeklyXpEarned} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-foreground">Recent activity</h2>
        {data.recentActivity.length === 0 ? (
          <EmptyState title="No activity yet" description="Recent games and recipes will show up here." />
        ) : (
          <ul className="space-y-2">
            {data.recentActivity.map((a, i) => (
              <li key={i} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-foreground/50">
                    {a.type === "game" ? "Game" : "Recipe"} · {new Date(a.date).toLocaleDateString()}
                    {a.pendingParentVerification && " · Waiting for your verification"}
                  </p>
                </div>
                <span className="font-bold text-accent">+{a.xpEarned} XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function WeeklySummaryTab({ childId }: { childId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["parent-dashboard", "weekly-summary", childId],
    queryFn: () => dashboardApi.getWeeklySummary(childId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Games Completed" value={data.gamesCompleted} />
      <StatCard label="Recipes Completed" value={data.recipesCompleted} />
      <StatCard label="Foods Tried" value={data.foodsTried} />
      <StatCard label="Nutrition Lessons" value={data.nutritionLessonsCompleted} />
      <StatCard label="XP Earned" value={data.totalXPEarned} />
      <StatCard label="Current Streak" value={data.currentStreak} />
    </div>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-foreground/50">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-foreground/5 px-3 py-1 text-sm">
          {item}
        </span>
      ))}
    </div>
  );
}

function LearningProgressTab({ childId }: { childId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["parent-dashboard", "learning-progress", childId],
    queryFn: () => dashboardApi.getLearningProgress(childId),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 font-bold text-foreground">Nutrition topics explored</h3>
        <TagList items={data.nutritionTopicsExplored} empty="No nutrition topics explored yet." />
      </section>
      <section>
        <h3 className="mb-2 font-bold text-foreground">Cooking skills learned</h3>
        <TagList items={data.cookingSkillsLearned} empty="No cooking skills logged yet." />
      </section>
      <section>
        <h3 className="mb-2 font-bold text-foreground">Foods discovered</h3>
        <TagList items={data.foodsDiscovered} empty="No foods discovered yet." />
      </section>
      <section>
        <h3 className="mb-2 font-bold text-foreground">Regions explored</h3>
        <TagList items={data.regionsUnlocked} empty="No regions explored yet." />
      </section>
    </div>
  );
}

function ActivityTab({ childId }: { childId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["parent-dashboard", "activity-history", childId, page],
    queryFn: () => dashboardApi.getActivityHistory(childId, page),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  const allEntries = [...data.data.games, ...data.data.recipes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      {allEntries.length === 0 ? (
        <EmptyState title="No activity yet" description="A full history of games and recipes will show up here." />
      ) : (
        <ul className="space-y-2">
          {allEntries.map((a, i) => (
            <li key={i} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">{a.title}</p>
                <p className="text-xs text-foreground/50">{new Date(a.date).toLocaleString()}</p>
              </div>
              <span className="font-bold text-accent">+{a.xpEarned} XP</span>
            </li>
          ))}
        </ul>
      )}
      {data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-11 rounded-full border border-foreground/10 px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
            disabled={page >= data.meta.totalPages}
            className="min-h-11 rounded-full border border-foreground/10 px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function GroceryTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["parent-dashboard", "grocery"],
    queryFn: dashboardApi.getGroceryOverview,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard label="Items needed" value={data.needed.length} />
      <StatCard label="Items checked off" value={data.checked.length} />
      {data.needed.length === 0 && data.checked.length === 0 && (
        <div className="sm:col-span-2">
          <EmptyState title="No grocery list yet" description="Add ingredients from a recipe to get started." />
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["parent-dashboard", "settings"],
    queryFn: dashboardApi.getSettings,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-surface p-5">
        <h3 className="mb-2 font-bold text-foreground">Account</h3>
        <p className="text-sm text-foreground/70">
          Email verified: <span className="font-semibold">{data.privacy.emailVerified ? "Yes" : "No"}</span>
        </p>
        <p className="text-sm text-foreground/70">
          Account status: <span className="font-semibold">{data.privacy.accountStatus}</span>
        </p>
      </section>
      <section className="rounded-3xl bg-surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-foreground">Children</h3>
          <Link to="/parent/children" className="text-sm font-semibold text-primary hover:underline">
            Manage
          </Link>
        </div>
        <ul className="space-y-1">
          {data.children.map((c) => (
            <li key={c._id} className="text-sm text-foreground/70">
              {c.displayName}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
