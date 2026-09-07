import { useEffect, useMemo, useState } from "react";

interface MemoryPair {
  id: string;
  label: string;
  icon?: string;
}

export interface MemoryConfig {
  pairs: MemoryPair[];
  parMoves?: number;
}

interface MemoryCard {
  cardId: string;
  pairId: string;
  label: string;
}

interface MemoryPlayerProps {
  config: MemoryConfig;
  onFinish: (outcome: { matchesFound: number; attempts: number; timeTakenSeconds: number }) => void | Promise<void>;
}

/**
 * Classic flip-two-cards memory game. `config.pairs` has one entry per
 * pair -- this component is responsible for generating the two face-down
 * cards per pair itself (the backend doesn't ship a pre-doubled deck; a
 * doubled, shuffled deck is purely a rendering concern, not game data).
 * Reports raw performance counters on finish (matchesFound, attempts,
 * timeTakenSeconds) -- this is a "reported-metric" gameType (see
 * gameType.schemas.js's doc comment): the server validates and clamps
 * these against config bounds rather than replaying the interaction
 * itself, since a real memory game's full client interaction isn't
 * practical to replay server-side.
 */
export function MemoryPlayer({ config, onFinish }: MemoryPlayerProps) {
  const deck = useMemo<MemoryCard[]>(() => {
    const cards: MemoryCard[] = config.pairs.flatMap((pair) => [
      { cardId: `${pair.id}-a`, pairId: pair.id, label: pair.label },
      { cardId: `${pair.id}-b`, pairId: pair.id, label: pair.label },
    ]);
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }, [config.pairs]);

  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [isCheckingMismatch, setIsCheckingMismatch] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  const allMatched = matchedPairIds.size === config.pairs.length;

  useEffect(() => {
    if (flippedCardIds.length !== 2) return;
    const [firstId, secondId] = flippedCardIds;
    const first = deck.find((c) => c.cardId === firstId)!;
    const second = deck.find((c) => c.cardId === secondId)!;
    setAttempts((prev) => prev + 1);

    if (first.pairId === second.pairId) {
      setMatchedPairIds((prev) => new Set(prev).add(first.pairId));
      setFlippedCardIds([]);
    } else {
      setIsCheckingMismatch(true);
      const timeout = setTimeout(() => {
        setFlippedCardIds([]);
        setIsCheckingMismatch(false);
      }, 800);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flippedCardIds]);

  function handleCardTap(card: MemoryCard) {
    if (isCheckingMismatch) return;
    if (flippedCardIds.length >= 2) return;
    if (flippedCardIds.includes(card.cardId)) return;
    if (matchedPairIds.has(card.pairId)) return;
    setFlippedCardIds((prev) => [...prev, card.cardId]);
  }

  async function handleFinish() {
    setSubmitting(true);
    const timeTakenSeconds = Math.round((Date.now() - startTime) / 1000);
    await onFinish({ matchesFound: matchedPairIds.size, attempts, timeTakenSeconds });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between text-sm text-foreground/60">
        <span>Matches: {matchedPairIds.size} / {config.pairs.length}</span>
        <span>Attempts: {attempts}</span>
      </div>

      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Memory cards">
        {deck.map((card) => {
          const isFlipped = flippedCardIds.includes(card.cardId) || matchedPairIds.has(card.pairId);
          const isMatched = matchedPairIds.has(card.pairId);
          return (
            <button
              key={card.cardId}
              onClick={() => handleCardTap(card)}
              disabled={isMatched || isCheckingMismatch}
              aria-label={isFlipped ? card.label : "Face-down card"}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-2xl border-2 p-2 text-center text-xs font-bold transition ${
                isMatched
                  ? "border-accent bg-accent/10 text-foreground/50"
                  : isFlipped
                    ? "border-primary bg-primary/10"
                    : "border-foreground/10 bg-surface hover:border-foreground/20"
              }`}
            >
              {isFlipped ? card.label : "?"}
            </button>
          );
        })}
      </div>

      {allMatched && (
        <button
          onClick={handleFinish}
          disabled={submitting}
          className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
        >
          {submitting ? "Checking..." : "Finish"}
        </button>
      )}
    </div>
  );
}
