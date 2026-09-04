import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { getErrorMessage } from "../../lib/errors";
import * as recipesApi from "../../api/recipes";
import { GROCERY_QUERY_KEY } from "../../api/grocery";

/**
 * FIXED (gap investigation follow-up): the backend endpoint
 * (POST /recipes/:id/add-to-grocery-list) and the web API client
 * function (addRecipeToGroceryList) both already existed and worked --
 * nothing on this page ever called it. A parent or child browsing a
 * recipe had no way to add its ingredients to the grocery list short of
 * calling the API directly. This is the one button that was missing.
 */
export function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();
  const queryClient = useQueryClient();
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["recipes", "detail", "child", slug, activeChild?._id],
    queryFn: () => recipesApi.getRecipeBySlug(slug!, "child", activeChild?._id),
    enabled: Boolean(slug) && Boolean(activeChild),
  });

  const addToGroceryMutation = useMutation({
    mutationFn: () => recipesApi.addRecipeToGroceryList(data!._id),
    onSuccess: (updatedList) => {
      // Same cache-update pattern GroceryListPage's own mutations use --
      // if the parent later opens the grocery list, it's already
      // up to date without a refetch.
      queryClient.setQueryData(GROCERY_QUERY_KEY, updatedList);
      setAddedMessage("Added to your grocery list!");
      setAddError(null);
    },
    onError: (err) => {
      setAddError(getErrorMessage(err));
      setAddedMessage(null);
    },
  });

  if (isLoading || !activeChild) return <LoadingState label="Loading recipe..." />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  // getRecipeBySlug(mode: "child") always returns RecipeDetailChildMode --
  // narrowed here since the function's return type is a union covering
  // both modes.
  if (!("needsGrownUpHelp" in data)) return null;

  if (data.unlocked === false) {
    return (
      <EmptyState
        icon="🔒"
        title={`${data.title} is locked`}
        description="Keep playing and leveling up to unlock this recipe!"
        action={
          <Link to="/recipes" className="inline-block min-h-11 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
            Back to Recipes
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/recipes" className="mb-4 inline-block text-sm font-semibold text-primary hover:underline">
        &larr; Back to Recipes
      </Link>

      <div className="mb-6 text-center">
        <span className="text-5xl" aria-hidden="true">
          🍽️
        </span>
        <h1 className="mt-2 text-2xl font-black text-foreground">{data.title}</h1>
        <p className="mt-1 text-foreground/60">{data.description}</p>
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-2 text-xs font-semibold text-foreground/50">
        <span className="rounded-full bg-foreground/5 px-3 py-1">{data.stepCount} steps</span>
        <span className="rounded-full bg-foreground/5 px-3 py-1">{data.totalTimeMinutes} min</span>
        <span className="rounded-full bg-foreground/5 px-3 py-1 capitalize">{data.difficulty}</span>
        {data.needsGrownUpHelp && <span className="rounded-full bg-secondary/30 px-3 py-1">Needs a grown-up</span>}
      </div>

      <div className="mb-6 rounded-3xl bg-surface p-5">
        <h2 className="mb-3 font-bold text-foreground">What you'll need</h2>
        <ul className="grid grid-cols-2 gap-2">
          {data.ingredients.map((ing) => (
            <li key={ing.name} className="rounded-xl bg-foreground/5 px-3 py-2 text-sm">
              {ing.name}
            </li>
          ))}
        </ul>
      </div>

      {data.funFacts.length > 0 && (
        <div className="mb-6 rounded-3xl bg-accent/10 p-5">
          <h2 className="mb-2 font-bold text-foreground">Fun fact</h2>
          <p className="text-sm text-foreground/70">{data.funFacts[0]}</p>
        </div>
      )}

      <button
        onClick={() => navigate(`/recipes/${slug}/cook`)}
        className="min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground"
      >
        Start Cooking
      </button>

      <button
        onClick={() => addToGroceryMutation.mutate()}
        disabled={addToGroceryMutation.isPending}
        className="mt-3 min-h-11 w-full rounded-full border border-foreground/10 py-3 font-semibold text-foreground disabled:opacity-50"
      >
        {addToGroceryMutation.isPending ? "Adding..." : "Add ingredients to grocery list"}
      </button>

      {addedMessage && (
        <p role="status" className="mt-3 text-center text-sm font-semibold text-accent">
          {addedMessage}
        </p>
      )}
      {addError && (
        <p role="alert" className="mt-3 text-center text-sm font-semibold text-danger">
          {addError}
        </p>
      )}
    </div>
  );
}
