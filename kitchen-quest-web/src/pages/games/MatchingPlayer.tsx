import { useMemo, useState } from "react";

interface MatchingItem {
  id: string;
  promptLabel: string;
  matchLabel: string;
  image?: string;
}

export interface MatchingConfig {
  items: MatchingItem[];
}

interface MatchingPlayerProps {
  config: MatchingConfig;
  onFinish: (outcome: { matchedPairs: { itemId: string; matchedWithItemId: string }[] }) => void | Promise<void>;
}

/**
 * Tap-to-connect matching: prompts on the left in their original order,
 * matches on the right SHUFFLED (never in prompt order, or the
 * positional alignment alone would give the answer away). Tap a prompt,
 * then tap a match to connect them; tap either side of an existing
 * connection to undo it. Scoring is server-side (recipe.service.js's
 * scoreMatching): a pair is correct only when both sides share the same
 * underlying item id, which this UI never reveals directly -- the child
 * only ever sees promptLabel/matchLabel text, never the ids themselves.
 */
export function MatchingPlayer({ config, onFinish }: MatchingPlayerProps) {
  // Shuffled once per mount, not on every render, so the layout doesn't
  // visibly reshuffle while the child is still working on it.
  const shuffledMatches = useMemo(() => {
    const arr = [...config.items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [config.items]);

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  // Maps a prompt item's id -> the match item's id it's currently
  // connected to (by the CHILD's choice, not necessarily correct).
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const connectedMatchIds = new Set(Object.values(connections));
  const allConnected = Object.keys(connections).length === config.items.length;

  function handlePromptTap(promptId: string) {
    if (connections[promptId]) {
      // Tapping an already-connected prompt disconnects it, so a child
      // can freely redo a match without a separate "clear" control.
      setConnections((prev) => {
        const next = { ...prev };
        delete next[promptId];
        return next;
      });
      setSelectedPromptId(null);
      return;
    }
    setSelectedPromptId(promptId === selectedPromptId ? null : promptId);
  }

  function handleMatchTap(matchId: string) {
    if (connectedMatchIds.has(matchId)) {
      // Tapping an already-used match disconnects whichever prompt it
      // was linked to, freeing both sides up again.
      const promptId = Object.entries(connections).find(([, m]) => m === matchId)?.[0];
      if (promptId) {
        setConnections((prev) => {
          const next = { ...prev };
          delete next[promptId];
          return next;
        });
      }
      return;
    }
    if (!selectedPromptId) return;
    setConnections((prev) => ({ ...prev, [selectedPromptId]: matchId }));
    setSelectedPromptId(null);
  }

  async function handleFinish() {
    setSubmitting(true);
    const matchedPairs = Object.entries(connections).map(([itemId, matchedWithItemId]) => ({ itemId, matchedWithItemId }));
    await onFinish({ matchedPairs });
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-6 text-center text-foreground/60">Tap a card on the left, then its match on the right.</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3" role="group" aria-label="Prompts">
          {config.items.map((item) => {
            const isConnected = Boolean(connections[item.id]);
            const isSelected = selectedPromptId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handlePromptTap(item.id)}
                aria-pressed={isSelected}
                aria-label={`${item.promptLabel}${isConnected ? ", connected -- tap to disconnect" : isSelected ? ", selected" : ""}`}
                className={`min-h-11 w-full rounded-2xl border-2 px-4 py-3 text-left font-semibold transition ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : isConnected
                      ? "border-accent bg-accent/10 text-foreground/70"
                      : "border-foreground/10 bg-surface hover:border-foreground/20"
                }`}
              >
                {item.promptLabel}
                {isConnected && (
                  <span className="ml-1" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-3" role="group" aria-label="Matches">
          {shuffledMatches.map((item) => {
            const isConnected = connectedMatchIds.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleMatchTap(item.id)}
                disabled={!selectedPromptId && !isConnected}
                aria-pressed={isConnected}
                aria-label={`${item.matchLabel}${isConnected ? ", connected -- tap to disconnect" : ""}`}
                className={`min-h-11 w-full rounded-2xl border-2 px-4 py-3 text-left font-semibold transition disabled:opacity-40 ${
                  isConnected ? "border-accent bg-accent/10 text-foreground/70" : "border-foreground/10 bg-surface hover:border-foreground/20"
                }`}
              >
                {item.matchLabel}
                {isConnected && (
                  <span className="ml-1" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleFinish}
        disabled={!allConnected || submitting}
        className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : allConnected ? "Finish" : `Match all ${config.items.length} to finish`}
      </button>
    </div>
  );
}
