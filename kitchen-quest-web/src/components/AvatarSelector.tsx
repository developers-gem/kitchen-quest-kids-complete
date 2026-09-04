import type { AvatarCatalog, AvatarCosmetic } from "../types/api";

const TONE_CLASS: Record<string, string> = {
  primary: "bg-primary/15 border-primary",
  secondary: "bg-secondary/25 border-secondary",
  accent: "bg-accent/20 border-accent",
  neutral: "bg-foreground/5 border-foreground/20",
};

const SLOT_LABELS: Record<AvatarCosmetic["slot"], string> = {
  hat: "Hats",
  accessory: "Accessories",
  background: "Backgrounds",
  colorVariant: "Color variants",
};

interface AvatarSelectorProps {
  catalog: AvatarCatalog;
  selectedCharacterId?: string;
  selectedColor: string;
  selectedCosmeticIds?: string[];
  onSelectCharacter: (characterId: string) => void;
  onSelectColor: (colorId: string) => void;
  onToggleCosmetic?: (cosmeticId: string) => void;
}

export function AvatarSelector({
  catalog,
  selectedCharacterId,
  selectedColor,
  selectedCosmeticIds = [],
  onSelectCharacter,
  onSelectColor,
  onToggleCosmetic,
}: AvatarSelectorProps) {
  // Grouped by slot so "Hats" and "Accessories" render as their own
  // sections rather than one undifferentiated grid -- mirrors how an
  // admin actually authors these (each cosmetic declares one slot).
  const cosmeticsBySlot = catalog.cosmetics.reduce<Record<string, AvatarCosmetic[]>>((acc, cosmetic) => {
    (acc[cosmetic.slot] ??= []).push(cosmetic);
    return acc;
  }, {});

  return (
    <div>
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Avatar</legend>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose an avatar character">
          {catalog.characters.map((c) => (
            <button
              key={c._id}
              type="button"
              role="radio"
              aria-checked={selectedCharacterId === c._id}
              title={c.label}
              onClick={() => onSelectCharacter(c._id)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg ${
                selectedCharacterId === c._id ? "border-foreground" : "border-transparent bg-foreground/5"
              }`}
            >
              {c.emoji ?? "🧑‍🍳"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-wide text-foreground/40">Color</legend>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Choose an avatar color">
          {catalog.colors.map((tone) => (
            <button
              key={tone.id}
              type="button"
              role="radio"
              aria-checked={selectedColor === tone.id}
              title={tone.label}
              onClick={() => onSelectColor(tone.id)}
              className={`h-11 w-11 rounded-full border-2 ${TONE_CLASS[tone.id] ?? TONE_CLASS.neutral} ${
                selectedColor === tone.id ? "ring-2 ring-offset-2 ring-foreground" : ""
              }`}
            />
          ))}
        </div>
      </fieldset>

      {Object.entries(cosmeticsBySlot).map(([slot, cosmetics]) => (
        <fieldset key={slot} className="mt-4">
          <legend className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
            {SLOT_LABELS[slot as AvatarCosmetic["slot"]] ?? slot}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={SLOT_LABELS[slot as AvatarCosmetic["slot"]] ?? slot}>
            {cosmetics.map((cosmetic) => {
              const locked = cosmetic.unlocked === false;
              const selected = selectedCosmeticIds.includes(cosmetic._id);
              return (
                <button
                  key={cosmetic._id}
                  type="button"
                  disabled={locked}
                  title={locked ? `${cosmetic.label} (locked)` : cosmetic.label}
                  aria-pressed={selected}
                  onClick={() => onToggleCosmetic?.(cosmetic._id)}
                  className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border-2 px-3 text-sm font-semibold transition ${
                    locked
                      ? "cursor-not-allowed border-transparent bg-foreground/5 text-foreground/30"
                      : selected
                        ? "border-foreground bg-foreground/10 text-foreground"
                        : "border-transparent bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
                  }`}
                >
                  {locked && <span aria-hidden="true">🔒</span>}
                  {cosmetic.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
