import { useCallback, useEffect, useRef, useState } from "react";

interface TimedChallengeItem {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface TimedChallengeConfig {
  timeLimitSeconds: number;
  targetCorrectCount: number;
  items: TimedChallengeItem[];
}

interface TimedChallengePlayerProps {
  config: TimedChallengeConfig;
  onFinish: (outcome: { tappedItemIds: string[]; timeTakenSeconds: number }) => void | Promise<void>;
}

/**
 * "Recognition" gameType, same as ingredientBuilder: `isCorrect` ships
 * to the client (see gameType.schemas.js's redaction comment) but is
 * never rendered as a visible flag -- the child judges each label for
 * themselves against the countdown, exactly like ingredientBuilder minus
 * the time pressure. Tapping toggles selection (a child can change their
 * mind before time runs out); submits automatically the moment the timer
 * hits zero, or immediately if the child taps "I'm done" first.
 */
export function TimedChallengePlayer({ config, onFinish }: TimedChallengePlayerProps) {
  const [secondsLeft, setSecondsLeft] = useState(config.timeLimitSeconds);
  const [tappedIds, setTappedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const hasFinishedRef = useRef(false);
  const startTime = useRef(Date.now());

  const finish = useCallback(async () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setSubmitting(true);
    const timeTakenSeconds = Math.min(config.timeLimitSeconds, Math.round((Date.now() - startTime.current) / 1000));
    await onFinish({ tappedItemIds: Array.from(tappedIds), timeTakenSeconds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tappedIds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      finish();
      return;
    }
    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function toggle(id: string) {
    if (hasFinishedRef.current) return;
    setTappedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 text-center">
        <p className={`text-3xl font-black ${secondsLeft <= 5 ? "text-danger" : "text-foreground"}`}>{secondsLeft}s</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Items">
        {config.items.map((item) => {
          const selected = tappedIds.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              aria-pressed={selected}
              disabled={submitting}
              className={`min-h-11 rounded-2xl border-2 px-4 py-3 font-semibold transition disabled:opacity-40 ${
                selected ? "border-primary bg-primary/10" : "border-foreground/10 bg-surface hover:border-foreground/20"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={finish}
        disabled={submitting}
        className="mt-8 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : "I'm done"}
      </button>
    </div>
  );
}
