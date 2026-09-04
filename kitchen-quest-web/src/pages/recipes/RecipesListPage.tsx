import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { RecipeCard } from "../../components/RecipeCard";
import { getErrorMessage } from "../../lib/errors";
import * as recipesApi from "../../api/recipes";

/** Closes another slice of production readiness audit finding A4 --
 * mirrors GamesListPage/FlavorHubPage's established pattern: browse via
 * an already-built, previously-unused card component, against a backend
 * contract that was already complete and tested. */
export function RecipesListPage() {
  const { activeChild, isLoading: isLoadingChildren, children } = useActiveChild();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["recipes", activeChild?._id, search],
    queryFn: () => recipesApi.listRecipes({ childId: activeChild?._id, search: search || undefined, limit: 50 }),
    enabled: !isLoadingChildren && children.length > 0,
  });

  if (isLoadingChildren) return <LoadingState label="Loading your family..." />;

  if (children.length === 0) {
    return <EmptyState icon="🍽️" title="No chefs yet!" description="Add a child profile to start cooking recipes." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Recipes</h1>
        <p className="text-sm text-foreground/60">
          {activeChild ? `Cooking as ${activeChild.displayName}` : "Choose a recipe to cook"}
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search recipes..."
        className="mb-6 min-h-11 w-full max-w-sm rounded-full border border-foreground/10 px-5 py-2.5 outline-none focus:border-primary"
      />

      {isLoading && <LoadingState label="Loading recipes..." />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState title="No recipes found" description="Try a different search, or check back soon for new dishes!" />
      )}

      {data && data.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
