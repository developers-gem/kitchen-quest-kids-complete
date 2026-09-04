import type { GroceryItem as GroceryItemType } from "../types/api";

interface GroceryItemProps {
  item: GroceryItemType;
  onToggle: (checked: boolean) => void;
  onRemove: () => void;
}

export function GroceryItem({ item, onToggle, onRemove }: GroceryItemProps) {
  const qty = item.quantity ? ` (${item.quantity}${item.unit ? ` ${item.unit}` : ""})` : "";

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/5 px-4 py-3">
      <label className="flex min-h-11 flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 shrink-0"
          aria-label={`Mark ${item.name} as ${item.checked ? "not bought" : "bought"}`}
        />
        <span className={item.checked ? "text-foreground/40 line-through" : "text-foreground/80"}>
          {item.name}
          {qty}
        </span>
        {item.custom && (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold text-foreground/50">Custom</span>
        )}
      </label>
      <button
        onClick={onRemove}
        aria-label={`Remove ${item.name} from grocery list`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/40 hover:bg-foreground/10 hover:text-danger"
      >
        ✕
      </button>
    </li>
  );
}
