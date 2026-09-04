import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { GameCard } from "../../components/GameCard";
import { getErrorMessage } from "../../lib/errors";
import * as gamesApi from "../../api/games";

/**
 * Closes another slice of production readiness audit finding A4 -- the
 * games catalog was a ComingSoonPage placeholder despite game.service.js
 * (list + per-child unlock/bestStars annotation) being complete and
 * tested, and GameCard already having been built for the Home Dashboard.
 * Actual gameplay lives in GamePlayPage; this is browsing only.
 */
export function GamesListPage() {
  const { activeChild, isLoading: isLoadingChildren, children } = useActiveChild();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["games", activeChild?._id, search],
    queryFn: () => gamesApi.listGames({ childId: activeChild?._id, search: search || undefined, limit: 50 }),
    enabled: !isLoadingChildren && children.length > 0,
  });

  if (isLoadingChildren) return <LoadingState label="Loading your family..." />;

  if (children.length === 0) {
    return <EmptyState icon="🎮" title="No chefs yet!" description="Add a child profile to start playing games." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Games</h1>
        <p className="text-sm text-foreground/60">
          {activeChild ? `Playing as ${activeChild.displayName}` : "Choose a game to play"}
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search games..."
        className="mb-6 min-h-11 w-full max-w-sm rounded-full border border-foreground/10 px-5 py-2.5 outline-none focus:border-primary"
      />

      {isLoading && <LoadingState label="Loading games..." />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState title="No games found" description="Try a different search, or check back soon for new games!" />
      )}

      {data && data.data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.data.map((game) => (
            <GameCard key={game._id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
