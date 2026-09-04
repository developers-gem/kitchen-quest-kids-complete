import { request } from "../../api/client";
import { createAdminApi } from "./adminApiClient";
import type { AdminRegion, RegionAssignedContent } from "../types/contentTypes";

export const adminRegionsApi = {
  ...createAdminApi<AdminRegion>("/admin/regions"),
  getAssignedContent(id: string) {
    return request<RegionAssignedContent>(`/admin/regions/${id}/content`);
  },
};
