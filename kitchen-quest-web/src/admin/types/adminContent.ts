export type ContentStatus = "draft" | "review" | "published" | "archived";

export const ALL_STATUSES: ContentStatus[] = ["draft", "review", "published", "archived"];

/** Mirrors the backend's allowed-transition table (contentWorkflow.js)
 * exactly, so the UI never offers a transition button the API would
 * reject -- this is a UX convenience, not a security boundary; the
 * backend re-validates every transition regardless. */
export const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["review", "archived"],
  review: ["draft", "published"],
  published: ["archived"],
  archived: ["draft"],
};

/** Spread into every admin content type's interface -- matches
 * auditableContentFields() on the backend field-for-field. */
export interface AuditFields {
  status: ContentStatus;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  publishedBy?: string;
  publishedAt?: string;
}

export interface AdminListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
