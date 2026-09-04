import { createAdminApi } from "./adminApiClient";
import type { AdminDailyChallenge } from "../types/contentTypes";

export const adminDailyChallengesApi = createAdminApi<AdminDailyChallenge>("/admin/daily-challenges");
