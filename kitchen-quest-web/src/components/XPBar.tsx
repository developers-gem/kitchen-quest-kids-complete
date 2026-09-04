interface XPBarProps {
  currentLevel: number;
  totalXP: number;
  xpPerLevel?: number;
}

/** Purely presentational -- the level/XP-within-level math mirrors the
 * backend's xpEngine.ts curve (level N = N*100 cumulative XP) ONLY for
 * *display* purposes (how full the bar looks). The authoritative
 * currentLevel/totalXP values always come from the API; this component
 * never decides what level someone is, only how to draw the bar for the
 * level/XP it's given. */
export function XPBar({ currentLevel, totalXP, xpPerLevel = 100 }: XPBarProps) {
  const xpIntoLevel = totalXP % xpPerLevel;
  const percent = Math.min(100, Math.round((xpIntoLevel / xpPerLevel) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs font-black text-foreground">LVL {currentLevel}</span>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Level progress: ${xpIntoLevel} of ${xpPerLevel} XP to next level`}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-foreground/10"
      >
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground/50">{totalXP} XP</span>
    </div>
  );
}
