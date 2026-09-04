import { request } from "./client";
import type { GroceryList } from "../types/api";

// Shared so any page that mutates the grocery list (GroceryListPage's own
// add/toggle/remove, or a recipe page adding ingredients) can update the
// same React Query cache entry consistently, rather than each page
// re-declaring its own copy of this key and silently drifting apart.
export const GROCERY_QUERY_KEY = ["grocery"];

export function getActiveGroceryList() {
  return request<GroceryList>("/grocery");
}

export interface AddCustomItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export function addCustomGroceryItem(input: AddCustomItemInput) {
  return request<GroceryList>("/grocery/items", { method: "POST", body: input });
}

export function setGroceryItemChecked(itemId: string, checked: boolean) {
  return request<GroceryList>(`/grocery/items/${itemId}`, { method: "PATCH", body: { checked } });
}

export function removeGroceryItem(itemId: string) {
  return request<GroceryList>(`/grocery/items/${itemId}`, { method: "DELETE" });
}