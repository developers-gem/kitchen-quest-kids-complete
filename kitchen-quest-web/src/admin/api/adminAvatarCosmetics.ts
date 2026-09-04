import { createAdminApi } from "./adminApiClient";
import type { AdminAvatarCosmetic } from "../types/contentTypes";

export const adminAvatarCosmeticsApi = createAdminApi<AdminAvatarCosmetic>("/admin/avatar-cosmetics");
