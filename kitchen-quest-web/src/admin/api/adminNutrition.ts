import { createAdminApi } from "./adminApiClient";
import type { AdminFoodFact, AdminNutritionLesson } from "../types/contentTypes";

export const adminNutritionLessonsApi = createAdminApi<AdminNutritionLesson>("/admin/nutrition/lessons");
export const adminFoodFactsApi = createAdminApi<AdminFoodFact>("/admin/nutrition/food-facts");
