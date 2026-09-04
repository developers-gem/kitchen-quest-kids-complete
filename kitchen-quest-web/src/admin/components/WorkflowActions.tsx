import { useState } from "react";
import { ALLOWED_TRANSITIONS, type ContentStatus } from "../types/adminContent";

const ACTION_LABELS: Record<ContentStatus, string> = {
  draft: "Send back to draft",
  review: "Submit for review",
  published: "Publish",
  archived: "Archive",
};

interface WorkflowActionsProps {
  currentStatus: ContentStatus;
  onTransition: (next: ContentStatus) => Promise<void>;
}

/** Only ever shows buttons for transitions the backend's workflow state
 * machine actually allows from the current status -- a UX convenience,
 * not the security boundary (the backend re-validates every transition
 * regardless of what this component renders). */
export function WorkflowActions({ currentStatus, onTransition }: WorkflowActionsProps) {
  const [pending, setPending] = useState<ContentStatus | null>(null);
  const nextOptions = ALLOWED_TRANSITIONS[currentStatus];

  async function handleClick(next: ContentStatus) {
    setPending(next);
    try {
      await onTransition(next);
    } finally {
      setPending(null);
    }
  }

  if (nextOptions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {nextOptions.map((next) => (
        <button
          key={next}
          onClick={() => handleClick(next)}
          disabled={pending !== null}
          className={`min-h-11 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${
            next === "published"
              ? "bg-accent text-foreground"
              : next === "archived"
                ? "bg-danger text-white"
                : "bg-foreground/10 text-foreground"
          }`}
        >
          {pending === next ? "Working..." : ACTION_LABELS[next]}
        </button>
      ))}
    </div>
  );
}
