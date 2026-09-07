import { useMemo, useState } from "react";

interface DragSlot {
  id: string;
  order: number;
  label: string;
}

interface DraggableItem {
  id: string;
  label: string;
  image?: string;
}

export interface DragAndDropConfig {
  slots: DragSlot[];
  draggableItems: DraggableItem[];
}

interface DragAndDropPlayerProps {
  config: DragAndDropConfig;
  onFinish: (outcome: { placements: { slotId: string; itemId: string }[] }) => void | Promise<void>;
}

/**
 * Tap-to-place, same interaction as SortingPlayer and for the same
 * reason (real drag-and-drop is a substantial touch+mouse+keyboard
 * gesture surface this app doesn't build a bespoke version of per game
 * type). The outcome shape (`placements: [{slotId, itemId}]`) is
 * structurally identical to sorting's (`placements: [{itemId, binId}]`)
 * -- this is genuinely the same mechanic as sorting with different
 * labels (slots instead of bins), which is why this component mirrors
 * SortingPlayer closely rather than reinventing the interaction.
 */
export function DragAndDropPlayer({ config, onFinish }: DragAndDropPlayerProps) {
  const orderedSlots = useMemo(() => [...config.slots].sort((a, b) => a.order - b.order), [config.slots]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, string>>({}); // itemId -> slotId
  const [submitting, setSubmitting] = useState(false);

  const unplacedItems = config.draggableItems.filter((item) => !placements[item.id]);
  const allPlaced = Object.keys(placements).length === config.draggableItems.length;

  function handleItemTap(itemId: string) {
    setSelectedItemId(itemId === selectedItemId ? null : itemId);
  }

  function handlePlacedItemTap(itemId: string) {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSelectedItemId(itemId);
  }

  function handleSlotTap(slotId: string) {
    if (!selectedItemId) return;
    setPlacements((prev) => ({ ...prev, [selectedItemId]: slotId }));
    setSelectedItemId(null);
  }

  async function handleFinish() {
    setSubmitting(true);
    const placementList = Object.entries(placements).map(([itemId, slotId]) => ({ slotId, itemId }));
    await onFinish({ placements: placementList });
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-6 text-center text-foreground/60">Tap a card, then tap the spot it goes in.</p>

      {unplacedItems.length > 0 && (
        <div className="mb-6" role="group" aria-label="Unplaced cards">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/40">To place</p>
          <div className="flex flex-wrap gap-2">
            {unplacedItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item.id)}
                  aria-pressed={isSelected}
                  className={`min-h-11 rounded-2xl border-2 px-4 py-3 font-semibold transition ${
                    isSelected ? "border-primary bg-primary/10" : "border-foreground/10 bg-surface hover:border-foreground/20"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {orderedSlots.map((slot) => {
          const placedItemId = Object.entries(placements).find(([, s]) => s === slot.id)?.[0];
          const placedItem = placedItemId ? config.draggableItems.find((i) => i.id === placedItemId) : null;
          return (
            <div
              key={slot.id}
              role="button"
              tabIndex={selectedItemId ? 0 : -1}
              aria-disabled={!selectedItemId}
              aria-label={`Place in ${slot.label}`}
              onClick={() => handleSlotTap(slot.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSlotTap(slot.id);
                }
              }}
              className={`flex min-h-11 items-center justify-between rounded-2xl border-2 border-dashed border-foreground/20 bg-surface p-3 ${
                selectedItemId ? "cursor-pointer" : "cursor-default opacity-60"
              }`}
            >
              <span className="text-sm font-bold text-foreground/50">{slot.label}</span>
              {placedItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlacedItemTap(placedItem.id);
                  }}
                  aria-label={`${placedItem.label}, placed in ${slot.label} -- tap to pick back up`}
                  className="min-h-11 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-semibold"
                >
                  {placedItem.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleFinish}
        disabled={!allPlaced || submitting}
        className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : allPlaced ? "Finish" : `Place all ${config.draggableItems.length} to finish`}
      </button>
    </div>
  );
}
