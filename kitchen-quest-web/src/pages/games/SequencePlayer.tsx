import { useState } from "react";

interface SequenceStep {
  id: string;
  label: string;
  image?: string;
}

export interface SequenceConfig {
  steps: SequenceStep[];
}

interface SequencePlayerProps {
  config: SequenceConfig;
  onFinish: (outcome: { submittedOrder: string[] }) => void | Promise<void>;
}

/**
 * Tap-in-order: steps arrive server-shuffled (the array's own order IS
 * the answer key -- see gameType.schemas.js's redactConfigForClient --
 * so the backend never ships them in the correct order). The child taps
 * steps one at a time in the order they believe is correct; tapped steps
 * move into a numbered "your order" list and can be tapped again there
 * to undo and re-pick.
 */
export function SequencePlayer({ config, onFinish }: SequencePlayerProps) {
  const [submittedOrder, setSubmittedOrder] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const remainingSteps = config.steps.filter((step) => !submittedOrder.includes(step.id));
  const allPlaced = submittedOrder.length === config.steps.length;
  const stepById = new Map(config.steps.map((s) => [s.id, s]));

  function handleStepTap(stepId: string) {
    setSubmittedOrder((prev) => [...prev, stepId]);
  }

  function handleUndoTap(stepId: string) {
    setSubmittedOrder((prev) => prev.filter((id) => id !== stepId));
  }

  async function handleFinish() {
    setSubmitting(true);
    await onFinish({ submittedOrder });
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-6 text-center text-foreground/60">Tap each step in the order you think it happens.</p>

      <div className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/40">Your order</p>
        {submittedOrder.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-foreground/20 p-4 text-center text-sm text-foreground/40">
            Tap a step below to start building your order
          </p>
        ) : (
          <ol className="space-y-2">
            {submittedOrder.map((id, index) => (
              <li key={id}>
                <button
                  onClick={() => handleUndoTap(id)}
                  aria-label={`Step ${index + 1}: ${stepById.get(id)?.label} -- tap to remove`}
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl border-2 border-accent bg-accent/10 px-4 py-3 text-left font-semibold"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-white">
                    {index + 1}
                  </span>
                  {stepById.get(id)?.label}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {remainingSteps.length > 0 && (
        <div role="group" aria-label="Remaining steps">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/40">Steps</p>
          <div className="flex flex-wrap gap-2">
            {remainingSteps.map((step) => (
              <button
                key={step.id}
                onClick={() => handleStepTap(step.id)}
                className="min-h-11 rounded-2xl border-2 border-foreground/10 bg-surface px-4 py-3 font-semibold hover:border-foreground/20"
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleFinish}
        disabled={!allPlaced || submitting}
        className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : allPlaced ? "Finish" : `Place all ${config.steps.length} steps to finish`}
      </button>
    </div>
  );
}
