import { useEffect, useRef, useState } from "react";

interface JsonFieldProps {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  hint?: string;
  rows?: number;
}

/**
 * A handful of fields across this system are genuinely polymorphic --
 * a game's `configuration` shape depends on `gameType` (9 different
 * shapes), `unlockRequirements`/`unlockCriteria` support a small rule
 * vocabulary that can nest (`allOf`/`anyOf`), and a nutrition lesson's
 * `quiz` reuses the quiz gameType's own shape. Building a bespoke visual
 * form builder for every one of those shapes is real scope -- likely a
 * follow-up phase once it's clear which shapes admins actually author
 * most often. For now, a raw JSON editor with clear parse-error feedback
 * is the honest, practical choice most real content-admin tools reach
 * for the first time they hit a genuinely polymorphic field, rather than
 * pretending a simplified visual editor covers cases it doesn't.
 *
 * FIXED (found while adding the Avatar Cosmetics editor): `text` used to
 * be initialized once from `value` via a lazy useState initializer and
 * never re-synced afterward. Every editor using this field follows the
 * same pattern -- render with a BLANK default while the existing record
 * is still loading, then swap in the real `value` once the query
 * resolves -- and that second update was silently ignored here, so
 * opening an existing achievement/cosmetic/game/region/lesson to edit it
 * showed the wrong starting JSON (the blank default) rather than its
 * actual saved value. Not just cosmetic: an admin who saw the wrong
 * content and edited it *relative to what was displayed* could
 * overwrite a real unlock rule based on a value that was never actually
 * there. Fixed by tracking the last value this field itself produced (or
 * was given) in a ref, and re-syncing `text` whenever the incoming
 * `value` prop differs from that -- so an external update (the real
 * record arriving) refreshes the textarea, while the user's own
 * keystrokes never fight against themselves (each keystroke's parsed
 * result updates the same ref, so it never looks like an "external"
 * change).
 */
export function JsonField({ label, value, onChange, hint, rows = 10 }: JsonFieldProps) {
  const serialize = (v: unknown) => JSON.stringify(v ?? {}, null, 2);
  const [text, setText] = useState(() => serialize(value));
  const [error, setError] = useState<string | null>(null);
  const lastKnownValueJson = useRef(JSON.stringify(value ?? {}));

  useEffect(() => {
    const incomingJson = JSON.stringify(value ?? {});
    if (incomingJson !== lastKnownValueJson.current) {
      lastKnownValueJson.current = incomingJson;
      setText(serialize(value));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(next: string) {
    setText(next);
    try {
      const parsed = JSON.parse(next);
      lastKnownValueJson.current = JSON.stringify(parsed ?? {});
      setError(null);
      onChange(parsed);
    } catch {
      setError("Not valid JSON yet -- keep typing or fix the syntax.");
    }
  }

  return (
    <div>
      <label className="text-sm font-semibold text-foreground/70">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-foreground/50">{hint}</p>}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`mt-1 w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none ${
          error ? "border-danger" : "border-foreground/10 focus:border-primary"
        }`}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
