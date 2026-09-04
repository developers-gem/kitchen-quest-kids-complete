import { request } from "./client";
import type { Region } from "../types/api";

export function listRegions(childId?: string) {
  return request<Region[]>("/regions", { query: { childId } });
}

export function getRegionBySlug(slug: string, childId?: string) {
  return request<Region & { games: { _id: string; title: string; slug: string; gameType: string }[] }>(
    `/regions/${slug}`,
    { query: { childId } }
  );
}
