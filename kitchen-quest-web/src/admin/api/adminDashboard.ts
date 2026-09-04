import { request } from "../../api/client";
import type { AdminDashboardOverview } from "../types/contentTypes";

export function getAdminDashboardOverview() {
  return request<AdminDashboardOverview>("/admin/dashboard/overview");
}
