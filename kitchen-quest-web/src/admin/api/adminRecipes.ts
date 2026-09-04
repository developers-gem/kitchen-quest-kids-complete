import { createAdminApi } from "./adminApiClient";
import type { AdminRecipe } from "../types/contentTypes";

export const adminRecipesApi = createAdminApi<AdminRecipe>("/admin/recipes");
