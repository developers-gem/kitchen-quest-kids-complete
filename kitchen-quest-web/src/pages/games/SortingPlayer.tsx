import { useState } from "react";

interface SortingBin {
  id: string;
  label: string;
}

interface SortingItem {
  id: string;
  label: string;
  image?: string;
}

export interface SortingConfig {
  bins: SortingBin[];
  items: SortingItem[];
}

interface SortingPlayerProps {
  config: SortingConfig;
  onFinish: (outcome: { placements: { itemId: string; binId: string }[] }) => void | Promise<void>;
}

/**
 * Tap-to-sort: tap an unplaced item to select it, then tap a bin to file
 * it there. Tap a placed item (shown under its bin) to pick it back up.
 * Same tap-select-then-tap-target interaction as MatchingPlayer, for the
 * same reason -- real drag-and-drop is its own substantial gesture-
 * handling surface (touch + mouse + accessibility for keyboard/switch
 * control), and tap-based sorting tests the same classification skill
 * without that added complexity. `config.items` arrives already
 * server-shuffled with `correctBinId` stripped -- this component has no
 * way to know or guess which bin is correct, matching every other
 * player's server-only-scoring design.
 */
export function SortingPlayer({ config, onFinish }: SortingPlayerProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // Maps an item's id -> the bin id it's currently placed in.
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const unplacedItems = config.items.filter((item) => !placements[item.id]);
  const allPlaced = Object.keys(placements).length === config.items.length;

  function handleItemTap(itemId: string) {
    setSelectedItemId(itemId === selectedItemId ? null : itemId);
  }

  function handlePlacedItemTap(itemId: string) {
    // Picking a sorted item back up -- no separate "undo" control needed.
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setSelectedItemId(itemId);
  }

  function handleBinTap(binId: string) {
    if (!selectedItemId) return;
    setPlacements((prev) => ({ ...prev, [selectedItemId]: binId }));
    setSelectedItemId(null);
  }

  async function handleFinish() {
    setSubmitting(true);
    const placementList = Object.entries(placements).map(([itemId, binId]) => ({ itemId, binId }));
    await onFinish({ placements: placementList });
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-6 text-center text-foreground/60">Tap a card, then tap the bin it belongs in.</p>

      {unplacedItems.length > 0 && (
        <div className="mb-6" role="group" aria-label="Unsorted cards">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/40">To sort</p>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {config.bins.map((bin) => {
          const itemsInBin = config.items.filter((item) => placements[item.id] === bin.id);
          return (
            <div
              key={bin.id}
              role="button"
              tabIndex={selectedItemId ? 0 : -1}
              aria-disabled={!selectedItemId}
              aria-label={`Place in ${bin.label}`}
              onClick={() => handleBinTap(bin.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBinTap(bin.id);
                }
              }}
              className={`min-h-24 rounded-2xl border-2 border-dashed border-foreground/20 bg-surface p-3 text-left ${
                selectedItemId ? "cursor-pointer" : "cursor-default opacity-60"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">{bin.label}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {itemsInBin.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlacedItemTap(item.id);
                    }}
                    aria-label={`${item.label}, sorted into ${bin.label} -- tap to pick back up`}
                    className="min-h-11 rounded-full bg-accent/20 px-3 py-1.5 text-sm font-semibold"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleFinish}
        disabled={!allPlaced || submitting}
        className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : allPlaced ? "Finish" : `Sort all ${config.items.length} to finish`}
      </button>
    </div>
  );
}
