import { Link } from "react-router-dom";
import type { RecipeSummary } from "../types/api";

interface RecipeCardProps {
  recipe: RecipeSummary;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const locked = recipe.unlocked === false;

  const content = (
    <div className={`overflow-hidden rounded-3xl bg-surface transition ${locked ? "opacity-50" : "hover:shadow-md"}`}>
      <div className="flex h-32 items-center justify-center bg-foreground/5 text-4xl" aria-hidden="true">
        {locked ? "🔒" : "🍽️"}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-foreground/50">
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">{recipe.stepCount} steps</span>
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 capitalize">{recipe.difficulty}</span>
          <span className="rounded-full bg-foreground/5 px-2 py-0.5">{recipe.totalTimeMinutes} min</span>
        </div>
        <p className="mt-2 font-bold text-foreground">{recipe.title}</p>
        {recipe.shortDescription && <p className="mt-1 text-sm text-foreground/60">{recipe.shortDescription}</p>}
      </div>
    </div>
  );

  if (locked) {
    return (
      <div aria-disabled="true" aria-label={`${recipe.title} (locked)`}>
        {content}
      </div>
    );
  }

  return (
    <Link to={`/recipes/${recipe.slug}`} className="block min-h-11 rounded-3xl focus-visible:outline-primary" aria-label={`View ${recipe.title}`}>
      {content}
    </Link>
  );
}
