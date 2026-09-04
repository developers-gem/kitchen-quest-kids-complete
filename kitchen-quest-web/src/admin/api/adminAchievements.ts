import { createAdminApi } from "./adminApiClient";
import type { AdminAchievement } from "../types/contentTypes";

export const adminAchievementsApi = createAdminApi<AdminAchievement>("/admin/achievements");
