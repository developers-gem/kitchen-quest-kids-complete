import { request } from "./client";
import type {
  ActivityHistoryResponse,
  DashboardOverview,
  GroceryOverview,
  LearningProgress,
  ParentSettings,
  WeeklySummary,
} from "../types/api";

export function getOverview(childId: string) {
  return request<DashboardOverview>("/parent-dashboard/overview", { query: { childId } });
}

export function getWeeklySummary(childId: string) {
  return request<WeeklySummary>("/parent-dashboard/weekly-summary", { query: { childId } });
}

export function getLearningProgress(childId: string) {
  return request<LearningProgress>("/parent-dashboard/learning-progress", { query: { childId } });
}

export function getActivityHistory(childId: string, page = 1, limit = 15) {
  return request<ActivityHistoryResponse>("/parent-dashboard/activity-history", {
    query: { childId, page, limit },
  });
}

export function getGroceryOverview() {
  return request<GroceryOverview>("/parent-dashboard/grocery");
}

export function getSettings() {
  return request<ParentSettings>("/parent-dashboard/settings");
}
