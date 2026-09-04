import type { ChildProfile } from "../types/api";
import { XPBar } from "./XPBar";
import { StreakBadge } from "./StreakBadge";

const TONE_CLASS: Record<string, string> = {
  primary: "bg-primary/15",
  secondary: "bg-secondary/25",
  accent: "bg-accent/20",
  neutral: "bg-foreground/5",
};

interface ChildHeaderProps {
  child: ChildProfile;
}

export function ChildHeader({ child }: ChildHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            TONE_CLASS[child.avatarColor] ?? TONE_CLASS.neutral
          }`}
          aria-hidden="true"
        >
          🧑‍🍳
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Welcome back</p>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">Hi, Chef {child.displayName}!</h1>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <div className="w-full sm:w-64">
          <XPBar currentLevel={child.currentLevel} totalXP={child.totalXP} />
        </div>
        <StreakBadge currentStreak={child.currentStreak} />
      </div>
    </header>
  );
}
