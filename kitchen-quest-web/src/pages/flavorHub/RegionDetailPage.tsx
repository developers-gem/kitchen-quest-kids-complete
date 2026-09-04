import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { getErrorMessage } from "../../lib/errors";
import * as regionsApi from "../../api/regions";

export function RegionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { activeChild } = useActiveChild();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["regions", slug, activeChild?._id],
    queryFn: () => regionsApi.getRegionBySlug(slug!, activeChild?._id),
    enabled: Boolean(slug),
  });

  if (isLoading) return <LoadingState label="Loading region..." />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div>
      <Link to="/flavor-hub" className="mb-4 inline-block text-sm font-semibold text-primary hover:underline">
        &larr; Back to Flavor Hub
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">
          🗺️
        </span>
        <div>
          <h1 className="text-2xl font-black text-foreground">{data.name}</h1>
          {data.state && <p className="text-sm text-foreground/60">{data.state}</p>}
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-foreground">Games in this region</h2>
      {data.games.length === 0 ? (
        <EmptyState title="No games here yet" description="Check back soon for new food adventures in this region!" />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {data.games.map((game) => (
            <li key={game._id}>
              {/* FIXED (gap investigation): these tiles used to be
                  static, non-interactive <li> elements with no way to
                  actually play the game from here -- a real dead end,
                  since GamesListPage was the only way to reach gameplay.
                  Links straight to the same GamePlayPage every other
                  entry point uses; that page already handles a locked
                  game correctly (this list doesn't carry per-game
                  unlock info, and doesn't need to -- the destination
                  checks it). */}
              <Link
                to={`/games/${game.slug}`}
                className="block min-h-11 rounded-3xl bg-surface p-5 text-center transition hover:bg-foreground/5 focus-visible:outline-primary"
                aria-label={`Play ${game.title}`}
              >
                <span className="text-2xl" aria-hidden="true">
                  🎮
                </span>
                <p className="mt-2 font-bold text-foreground">{game.title}</p>
                <p className="text-xs uppercase tracking-wide text-foreground/40">{game.gameType}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
