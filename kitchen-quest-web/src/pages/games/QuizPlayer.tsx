import { useState } from "react";

interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onFinish: (answers: { questionId: string; selectedOptionId: string }[]) => void | Promise<void>;
}

/**
 * The one gameType with a real interactive player -- see GamePlayPage's
 * doc comment for why the other 8 aren't built yet. `questions` here is
 * always the REDACTED shape (no correctOptionId) -- this component has
 * no way to know or guess which option is correct, matching the
 * backend's design that scoring only ever happens server-side.
 */
export function QuizPlayer({ questions, onFinish }: QuizPlayerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const selected = answers[question.id];

  function selectOption(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  async function handleNext() {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }));
    await onFinish(payload);
  }

  return (
    <div className="mx-auto max-w-md">
      <div
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={`Question ${index + 1} of ${questions.length}`}
        className="mb-6 h-2 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-foreground/40">
        Question {index + 1} of {questions.length}
      </p>
      <h2 className="mb-6 text-center text-xl font-black text-foreground">{question.prompt}</h2>

      <div className="space-y-3" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option) => (
          <button
            key={option.id}
            role="radio"
            aria-checked={selected === option.id}
            onClick={() => selectOption(option.id)}
            className={`min-h-11 w-full rounded-2xl border-2 px-5 py-3 text-left font-semibold transition ${
              selected === option.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-foreground/10 bg-surface text-foreground/80 hover:border-foreground/20"
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={!selected || submitting}
        className="mt-6 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40"
      >
        {submitting ? "Checking..." : isLast ? "Finish" : "Next"}
      </button>
    </div>
  );
}
