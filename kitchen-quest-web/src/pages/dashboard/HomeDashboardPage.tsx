import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useActiveChild } from "../../context/ActiveChildContext";
import { ChildHeader } from "../../components/ChildHeader";
import { ProgressCard } from "../../components/ProgressCard";
import { GameCard } from "../../components/GameCard";
import { RecipeCard } from "../../components/RecipeCard";
import { EmptyState } from "../../components/EmptyState";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import * as gamesApi from "../../api/games";
import * as recipesApi from "../../api/recipes";
import { getErrorMessage } from "../../lib/errors";

const FEATURED_LIMIT = 4;

export function HomeDashboardPage() {
  const { activeChild, isLoading: isLoadingChildren, children } = useActiveChild();

  const featuredGames = useQuery({
    queryKey: ["games", "featured", activeChild?._id],
    queryFn: () => gamesApi.listGames({ childId: activeChild!._id, limit: FEATURED_LIMIT }),
    enabled: Boolean(activeChild),
  });

  const featuredRecipes = useQuery({
    queryKey: ["recipes", "featured", activeChild?._id],
    queryFn: () => recipesApi.listRecipes({ childId: activeChild!._id, limit: FEATURED_LIMIT }),
    enabled: Boolean(activeChild),
  });

  if (isLoadingChildren) return <LoadingState label="Loading your family..." />;

  if (children.length === 0) {
    return (
      <EmptyState
        icon="🧑‍🍳"
        title="No chefs yet!"
        description="Add a child profile to start their food adventure."
        action={
          <Link
            to="/parent/children"
            className="inline-block min-h-11 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
          >
            Add your first chef
          </Link>
        }
      />
    );
  }

  if (!activeChild) return <LoadingState />;

  return (
    <div className="space-y-8">
      <ChildHeader child={activeChild} />

      {/* Daily challenge: honest empty state -- the DailyChallenge module
          doesn't exist on the backend yet (see the game-framework and
          production-audit docs' roadmap), so this never fabricates a fake
          challenge. When that module ships, this card becomes a real
          query with zero other changes to this page. */}
      <section aria-labelledby="daily-challenge-heading">
        <h2 id="daily-challenge-heading" className="sr-only">
          Daily challenge
        </h2>
        <div className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Daily Challenge</p>
          <p className="mt-2 text-xl font-black sm:text-2xl">Daily challenges are coming soon!</p>
          <p className="mt-1 text-sm opacity-90">Check back soon for a brand-new challenge every day.</p>
        </div>
      </section>

      <section aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="mb-3 text-lg font-bold text-foreground">
          Your progress
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ProgressCard label="Games Played" value={activeChild.progressStats.gamesPlayed} accentClassName="bg-primary" />
          <ProgressCard label="Recipes Cooked" value={activeChild.progressStats.recipesCompleted} accentClassName="bg-secondary" />
          <ProgressCard label="Foods Tried" value={activeChild.progressStats.foodsTried} accentClassName="bg-accent" />
          <ProgressCard label="Current Level" value={activeChild.currentLevel} accentClassName="bg-foreground/30" />
        </div>
      </section>

      <section aria-labelledby="featured-games-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="featured-games-heading" className="text-lg font-bold text-foreground">
            Featured games
          </h2>
          <Link to="/games" className="min-h-11 text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        {featuredGames.isLoading && <LoadingState label="Loading games..." />}
        {featuredGames.isError && <ErrorState message={getErrorMessage(featuredGames.error)} onRetry={() => featuredGames.refetch()} />}
        {featuredGames.data && featuredGames.data.data.length === 0 && (
          <EmptyState title="No games available yet" description="Check back soon for new food adventures!" />
        )}
        {featuredGames.data && featuredGames.data.data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {featuredGames.data.data.map((game) => (
              <GameCard key={game._id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="featured-recipes-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="featured-recipes-heading" className="text-lg font-bold text-foreground">
            Featured recipes
          </h2>
          <Link to="/recipes" className="min-h-11 text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        {featuredRecipes.isLoading && <LoadingState label="Loading recipes..." />}
        {featuredRecipes.isError && (
          <ErrorState message={getErrorMessage(featuredRecipes.error)} onRetry={() => featuredRecipes.refetch()} />
        )}
        {featuredRecipes.data && featuredRecipes.data.data.length === 0 && (
          <EmptyState title="No recipes available yet" description="Check back soon for new dishes to cook!" />
        )}
        {featuredRecipes.data && featuredRecipes.data.data.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRecipes.data.data.map((recipe) => (
              <RecipeCard key={recipe._id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
