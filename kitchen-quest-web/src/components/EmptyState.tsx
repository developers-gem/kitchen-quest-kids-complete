import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Used for every "nothing here yet" case (no games completed, no
 * children created, empty grocery list, ...) instead of each page
 * inventing its own copy/layout. */
export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="rounded-3xl bg-surface p-10 text-center">
      {icon && <div className="mb-3 flex justify-center text-4xl" aria-hidden="true">{icon}</div>}
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-foreground/60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
