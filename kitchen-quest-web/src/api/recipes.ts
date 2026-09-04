import { request, requestPaginated } from "./client";
import type {
  AgeRange,
  CompleteCookingResponse,
  Difficulty,
  RecipeDetailChildMode,
  RecipeDetailParentMode,
  RecipeSummary,
  StartCookingResponse,
  StepProgressResponse,
  VerifyCookingResponse,
} from "../types/api";
import type { GroceryList } from "../types/api";

export interface ListRecipesParams {
  ageRange?: AgeRange;
  difficulty?: Difficulty;
  maxTotalTimeMinutes?: number;
  allergenFree?: string; // comma-separated
  search?: string;
  childId?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export function listRecipes(params: ListRecipesParams = {}) {
  return requestPaginated<RecipeSummary[]>("/recipes", { query: params });
}

export function getRecipeBySlug(slug: string, mode: "child" | "parent", childId?: string) {
  return request<RecipeDetailParentMode | RecipeDetailChildMode>(`/recipes/${slug}`, { query: { mode, childId } });
}

export function startCooking(recipeId: string, childId: string) {
  return request<StartCookingResponse>(`/recipes/${recipeId}/start`, { method: "POST", body: { childId } });
}

export function getCurrentStep(progressId: string, childId: string) {
  return request<StepProgressResponse>(`/recipes/progress/${progressId}`, { query: { childId } });
}

export function advanceStep(progressId: string, childId: string) {
  return request<StepProgressResponse>(`/recipes/progress/${progressId}/advance`, { method: "POST", body: { childId } });
}

export function pauseCooking(progressId: string, childId: string) {
  return request<{ _id: string; status: string }>(`/recipes/progress/${progressId}/pause`, {
    method: "POST",
    body: { childId },
  });
}

export function resumeCooking(progressId: string, childId: string) {
  return request<StepProgressResponse>(`/recipes/progress/${progressId}/resume`, { method: "POST", body: { childId } });
}

export function completeCooking(progressId: string, childId: string) {
  return request<CompleteCookingResponse>(`/recipes/progress/${progressId}/complete`, {
    method: "POST",
    body: { childId },
  });
}

/** Parental-gate-protected on the backend -- a parent confirming a recipe
 * that needed supervision actually happened. */
export function verifyCooking(progressId: string, childId: string) {
  return request<VerifyCookingResponse>(`/recipes/progress/${progressId}/verify`, {
    method: "POST",
    body: { childId },
  });
}

export function addRecipeToGroceryList(recipeId: string) {
  return request<GroceryList>(`/recipes/${recipeId}/add-to-grocery-list`, { method: "POST" });
}
