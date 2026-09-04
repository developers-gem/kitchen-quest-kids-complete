import { request } from "./client";
import type { AgeRange, ChildProfile } from "../types/api";

export interface ChildProfileInput {
  displayName: string;
  ageRange: AgeRange;
  avatarConfigId?: string;
  avatarColor?: "primary" | "secondary" | "accent" | "neutral";
  preferences?: ChildProfile["preferences"];
}

export function listChildren() {
  return request<ChildProfile[]>("/children");
}

export function getChild(childId: string) {
  return request<ChildProfile>(`/children/${childId}`);
}

/** Parental-gate-protected on the backend. */
export function createChild(input: ChildProfileInput) {
  return request<ChildProfile>("/children", { method: "POST", body: input });
}

/** Parental-gate-protected on the backend. */
export function updateChild(childId: string, patch: Partial<ChildProfileInput>) {
  return request<ChildProfile>(`/children/${childId}`, { method: "PATCH", body: patch });
}

/** Parental-gate-protected on the backend. Soft-delete -- progress history
 * is preserved server-side even though the profile disappears from lists. */
export function deleteChild(childId: string) {
  return request<void>(`/children/${childId}`, { method: "DELETE" });
}

/** Switches which child is "playing" -- reissues the parent's own access
 * token with an activeChildId claim. The child never gets a credential. */
export function activateChild(childId: string) {
  return request<{ child: ChildProfile; accessToken: string }>(`/children/${childId}/activate`, { method: "POST" });
}

export interface ChildProgressSummary {
  childId: string;
  displayName: string;
  currentLevel: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  progressStats: ChildProfile["progressStats"];
  unlockedRegionsCount: number;
  badgesCount: number;
}

export function getChildProgress(childId: string) {
  return request<ChildProgressSummary>(`/children/${childId}/progress`);
}
