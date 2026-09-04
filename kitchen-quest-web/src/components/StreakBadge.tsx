interface StreakBadgeProps {
  currentStreak: number;
}

export function StreakBadge({ currentStreak }: StreakBadgeProps) {
  if (currentStreak <= 0) {
    return (
      <span className="rounded-full bg-foreground/5 px-4 py-2 text-sm font-semibold text-foreground/50">
        Start a streak today!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/30 px-4 py-2 text-sm font-bold text-foreground">
      <span aria-hidden="true">🔥</span>
      {currentStreak} Day{currentStreak === 1 ? "" : "s"} Streak
    </span>
  );
}
