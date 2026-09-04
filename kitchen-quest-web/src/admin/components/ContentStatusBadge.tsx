import type { ContentStatus } from "../types/adminContent";

const STATUS_STYLES: Record<ContentStatus, string> = {
  draft: "bg-foreground/10 text-foreground/60",
  review: "bg-secondary/30 text-foreground",
  published: "bg-accent/25 text-foreground",
  archived: "bg-danger/10 text-danger",
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
