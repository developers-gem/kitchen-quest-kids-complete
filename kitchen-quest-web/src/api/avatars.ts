import { request } from "./client";
import type { AvatarCatalog } from "../types/api";

export function getAvatarCatalog(childId?: string) {
  return request<AvatarCatalog>("/avatars", { query: childId ? { childId } : undefined });
}
