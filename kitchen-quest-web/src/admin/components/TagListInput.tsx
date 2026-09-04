import { useState, type KeyboardEvent } from "react";

interface TagListInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

/** Used for every `string[]` field across the admin editors --
 * learningObjectives, foodTopics, nutritionTopics, cookingSkills,
 * funFacts, allergenInformation, featuredFoods -- one component instead
 * of a bespoke input per field. */
export function TagListInput({ label, values, onChange, placeholder }: TagListInputProps) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-foreground/70">{label}</label>
      <div className="mt-1 flex flex-wrap gap-2 rounded-2xl border border-foreground/10 p-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-sm">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="text-foreground/40 hover:text-danger"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder ?? "Type and press Enter"}
          className="min-w-32 flex-1 border-none px-2 py-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}
