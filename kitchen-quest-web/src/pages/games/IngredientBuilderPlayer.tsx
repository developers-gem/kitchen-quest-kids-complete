import { useMemo, useState } from "react";

interface IngredientItem {
  id: string;
  label: string;
  image?: string;
}

export interface IngredientBuilderConfig {
  targetItems: IngredientItem[];
  distractorItems: IngredientItem[];
}

interface IngredientBuilderPlayerProps {
  config: IngredientBuilderConfig;
  onFinish: (outcome: { selectedItemIds: string[] }) => void | Promise<void>;
}

/**
 * "Recognition" gameType (see gameType.schemas.js's redaction comment):
 * targetItems and distractorItems both ship to the client as-is, with no
 * hidden flag distinguishing them visually -- correctly picking the real
 * ingredients out from distractors (e.g. picking fruit, not candy, for a
 * smoothie) IS the lesson, not a hidden answer key being protected. Every
 * item is shuffled together into one pool so the two source arrays'
 * order never hints at which is which.
 */
export function IngredientBuilderPlayer({ config, onFinish }: IngredientBuilderPlayerProps) {
  const allItems = useMemo(() => {
    const combined = [...config.targetItems, ...config.distractorItems];
    const shuffled = [...combined];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [config.targetItems, config.distractorItems]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    setSubmitting(true);
    await onFinish({ selectedItemIds: Array.from(selectedIds) });
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-6 text-center text-foreground/60">Tap every ingredient that belongs, then finish.</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Ingredients">
        {allItems.map((item) => {
          const selected = selectedIds.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              aria-pressed={selected}
              className={`min-h-11 rounded-2xl border-2 px-4 py-3 font-semibold transition ${
                selected ? "border-primary bg-primary/10" : "border-foreground/10 bg-surface hover:border-foreground/20"
              }`}
            >
              {item.label}
              {selected && (
                <span className="ml-1" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleFinish}
        disabled={selectedIds.size === 0 || submitting}
        className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : "Finish"}
      </button>
    </div>
  );
}
