import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { getErrorMessage } from "../../lib/errors";
import { ALL_STATUSES, type ContentStatus } from "../types/adminContent";
import type { AdminListParams } from "../api/adminApiClient";

interface AdminContentListPageProps<T extends { _id: string }> {
  title: string;
  queryKey: string;
  fetchList: (params: AdminListParams) => Promise<{ data: T[]; meta: { totalPages: number } }>;
  createPath: string;
  renderRow: (item: T) => ReactNode;
  columns: string[];
  searchPlaceholder?: string;
}

/**
 * One generic list screen powers every content type's list view (games,
 * recipes, regions, nutrition lessons, food facts, achievements) --
 * pagination, search, and status filtering are identical concerns
 * regardless of what's being listed, mirroring the backend's single
 * `createAdminContentService.list` implementation. Only `columns` and
 * `renderRow` (what a single row looks like) are content-type-specific.
 */
export function AdminContentListPage<T extends { _id: string }>({
  title,
  queryKey,
  fetchList,
  createPath,
  renderRow,
  columns,
  searchPlaceholder = "Search...",
}: AdminContentListPageProps<T>) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ContentStatus | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [queryKey, page, status, search],
    queryFn: () => fetchList({ page, limit: 20, status: status || undefined, search: search || undefined }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{title}</h1>
        <Link to={createPath} className="min-h-11 rounded-lg bg-neutral-900 px-4 py-2.5 font-semibold text-white">
          + New
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          className="min-h-11 flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 outline-none focus:border-neutral-400"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContentStatus | "");
            setPage(1);
          }}
          className="min-h-11 rounded-lg border border-neutral-200 bg-white px-4 py-2"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.data.length === 0 && (
        <EmptyState title="Nothing here yet" description="Create your first one to get started." />
      )}

      {data && data.data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-bold uppercase tracking-wide text-neutral-500">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-4 py-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.data.map((item) => (
                <tr key={item._id} className="hover:bg-neutral-50">
                  {renderRow(item)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-11 rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {page} of {data.meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
            disabled={page >= data.meta.totalPages}
            className="min-h-11 rounded-lg border border-neutral-200 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
