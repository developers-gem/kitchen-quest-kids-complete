import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { getErrorMessage } from "../../lib/errors";
import * as recipesApi from "../../api/recipes";
import type { CurrentStepView } from "../../types/api";

/**
 * The interactive cooking flow: start (or transparently resume a paused
 * session -- recipe.service.js's startCooking already handles that
 * server-side, so this page never needs its own separate "resume" UI) ->
 * walk through one step at a time -> complete -> either a celebration
 * screen (XP awarded immediately) or an honest "waiting for a grown-up"
 * state when the recipe requires parent verification.
 */
export function CookingModePage() {
  const { slug } = useParams<{ slug: string }>();
  const { activeChild } = useActiveChild();

  const { data: recipe, isLoading: isLoadingRecipe } = useQuery({
    queryKey: ["recipes", "detail", "child", slug, activeChild?._id],
    queryFn: () => recipesApi.getRecipeBySlug(slug!, "child", activeChild?._id),
    enabled: Boolean(slug) && Boolean(activeChild),
  });

  const [progressId, setProgressId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CurrentStepView | null>(null);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [stage, setStage] = useState<"starting" | "cooking" | "completed" | "pendingVerification">("starting");
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    if (!recipe || !activeChild || !("_id" in recipe)) return;
    let cancelled = false;
    recipesApi
      .startCooking(recipe._id, activeChild._id)
      .then((res) => {
        if (cancelled) return;
        setProgressId(res.progress._id);
        setCurrentStep(res.currentStep);
        setReadyToComplete(res.readyToComplete);
        setStage("cooking");
      })
      .catch((err: unknown) => {
        if (!cancelled) setStartError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, activeChild?._id]);

  async function handleAdvance() {
    if (!progressId || !activeChild) return;
    const res = await recipesApi.advanceStep(progressId, activeChild._id);
    setCurrentStep(res.currentStep);
    setReadyToComplete(res.readyToComplete);
  }

  async function handleComplete() {
    if (!progressId || !activeChild) return;
    const res = await recipesApi.completeCooking(progressId, activeChild._id);
    setXpEarned(res.progress.xpEarned);
    setStage(res.progress.pendingParentVerification ? "pendingVerification" : "completed");
  }

  if (isLoadingRecipe || !activeChild) return <LoadingState label="Loading recipe..." />;

  if (startError) {
    return <ErrorState message={startError} />;
  }

  if (stage === "starting") {
    return <LoadingState label="Getting your kitchen ready..." />;
  }

  if (stage === "pendingVerification") {
    return (
      <div className="mx-auto max-w-md text-center">
        <span className="text-6xl" aria-hidden="true">
          👩‍🍳
        </span>
        <h1 className="mt-3 text-2xl font-black text-foreground">Great cooking!</h1>
        <p className="mt-2 text-foreground/60">
          Ask a grown-up to confirm what you made in the Parent Dashboard to earn your XP.
        </p>
        <Link to="/recipes" className="mt-6 inline-block min-h-11 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">
          Back to Recipes
        </Link>
      </div>
    );
  }

  if (stage === "completed") {
    return (
      <div className="mx-auto max-w-md text-center">
        <span className="text-6xl" aria-hidden="true">
          🎉
        </span>
        <h1 className="mt-3 text-2xl font-black text-foreground">You did it!</h1>
        <div className="mt-6 rounded-3xl bg-surface p-5">
          <p className="text-3xl font-black text-accent">+{xpEarned} XP</p>
        </div>
        <Link to="/recipes" className="mt-6 inline-block min-h-11 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">
          Back to Recipes
        </Link>
      </div>
    );
  }

  if (!currentStep) {
    // Legitimately reached when re-opening a session that had already
    // advanced through every step but was never completed (see the
    // startCooking bugfix this page's data comes from) -- show the
    // finish prompt directly rather than a step that doesn't exist.
    return (
      <div className="mx-auto max-w-md text-center">
        <span className="text-5xl" aria-hidden="true">
          👏
        </span>
        <h2 className="mt-3 text-xl font-black text-foreground">All steps done!</h2>
        <p className="mt-2 text-foreground/60">Ready to finish up?</p>
        <button
          onClick={handleComplete}
          className="mt-6 min-h-11 w-full rounded-full bg-accent py-3 font-bold text-foreground"
        >
          Finish Cooking
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/40">
        Step {currentStep.stepNumber} of {currentStep.totalSteps}
      </p>

      <div
        role="progressbar"
        aria-valuenow={currentStep.stepNumber}
        aria-valuemin={1}
        aria-valuemax={currentStep.totalSteps}
        aria-label={`Step ${currentStep.stepNumber} of ${currentStep.totalSteps}`}
        className="mb-6 h-2 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${(currentStep.stepNumber / currentStep.totalSteps) * 100}%` }}
        />
      </div>

      <h2 className="mb-2 text-center text-xl font-black text-foreground">{currentStep.title}</h2>
      <p className="text-center text-foreground/70">{currentStep.instruction}</p>

      {currentStep.needsGrownUp && (
        <p className="mt-4 rounded-2xl bg-secondary/20 px-4 py-3 text-center text-sm font-semibold text-foreground">
          🧑‍🍳 Ask a grown-up to help with this step!
        </p>
      )}

      {readyToComplete ? (
        <button
          onClick={handleComplete}
          className="mt-6 min-h-11 w-full rounded-full bg-accent py-3 font-bold text-foreground"
        >
          Finish Cooking
        </button>
      ) : (
        <button onClick={handleAdvance} className="mt-6 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">
          Next Step
        </button>
      )}
    </div>
  );
}
