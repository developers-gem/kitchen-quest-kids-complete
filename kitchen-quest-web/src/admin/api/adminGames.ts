import { createAdminApi } from "./adminApiClient";
import type { AdminGame } from "../types/contentTypes";

export const adminGamesApi = createAdminApi<AdminGame>("/admin/games");
