import { request, requestPaginated } from "../../api/client";
import type { AdminListMeta, ContentStatus } from "../types/adminContent";

export interface AdminListParams {
  page?: number;
  limit?: number;
  status?: ContentStatus;
  search?: string;
  [key: string]: string | number | undefined;
}

/**
 * Mirrors the backend's createAdminContentService factory one-for-one:
 * the same six operations (list/get/create/update/transitionStatus/
 * remove), generated for any content type's base path, instead of
 * writing six near-identical API modules by hand. Adding a 7th
 * admin-managed content type on the frontend is one call to this
 * factory, exactly like adding it on the backend is one call to its
 * factory -- the two sides of this system are intentionally symmetric.
 */
export function createAdminApi<T extends { _id: string }, CreateInput = Partial<T>, UpdateInput = Partial<T>>(
  basePath: string
) {
  return {
    list(params: AdminListParams = {}) {
      return requestPaginated<T[]>(basePath, { query: params }).then((r) => ({
        data: r.data,
        meta: r.meta as AdminListMeta,
      }));
    },
    getById(id: string) {
      return request<T>(`${basePath}/${id}`);
    },
    create(input: CreateInput) {
      return request<T>(basePath, { method: "POST", body: input });
    },
    update(id: string, patch: UpdateInput) {
      return request<T>(`${basePath}/${id}`, { method: "PATCH", body: patch });
    },
    transitionStatus(id: string, status: ContentStatus) {
      return request<T>(`${basePath}/${id}/status`, { method: "POST", body: { status } });
    },
    remove(id: string) {
      return request<void>(`${basePath}/${id}`, { method: "DELETE" });
    },
  };
}
