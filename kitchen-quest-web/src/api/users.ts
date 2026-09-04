import { request } from "./client";
import type { NotificationPreference, User } from "../types/api";

export function getMe() {
  return request<User>("/users/me");
}

export function updateMe(patch: Partial<Pick<User, "firstName" | "lastName" | "timezone" | "locale">> & {
  notificationPreferences?: NotificationPreference[];
}) {
  return request<User>("/users/me", { method: "PATCH", body: patch });
}

/** Parental-gate-protected: account deletion is a high-stakes action. */
export function deleteMyAccount() {
  return request<void>("/users/me", { method: "DELETE" });
}
