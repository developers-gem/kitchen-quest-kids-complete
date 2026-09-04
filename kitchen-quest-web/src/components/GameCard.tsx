import { Link } from "react-router-dom";
import type { GameSummary } from "../types/api";

const STAR_FILLED = "★";
const STAR_EMPTY = "☆";

interface GameCardProps {
  game: GameSummary;
}

/** Locked state is server-derived (`game.unlocked`, computed by the
 * backend's unlock-rule engine) -- this component only renders what it's
 * told, it never decides lock status itself. */
export function GameCard({ game }: GameCardProps) {
  const locked = game.unlocked === false;

  const content = (
    <div
      className={`flex h-full flex-col items-center justify-center gap-2 rounded-3xl p-5 text-center transition ${
        locked ? "bg-foreground/5 text-foreground/40" : "bg-surface hover:shadow-md"
      }`}
    >
      <span className="text-3xl" aria-hidden="true">
        {locked ? "🔒" : "🎮"}
      </span>
      <p className="font-bold">{game.title}</p>
      {game.state && <p className="text-xs uppercase tracking-wide text-foreground/40">{game.state}</p>}
      {!locked && (
        <p aria-label={`${game.bestStars ?? 0} of ${game.maxStars} stars`} className="text-amber-500">
          {Array.from({ length: game.maxStars }, (_, i) => (
            <span key={i} aria-hidden="true">
              {i < (game.bestStars ?? 0) ? STAR_FILLED : STAR_EMPTY}
            </span>
          ))}
        </p>
      )}
    </div>
  );

  if (locked) {
    return (
      <div className="min-h-11" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/games/${game.slug}`}
      className="block min-h-11 rounded-3xl focus-visible:outline-primary"
      aria-label={`Play ${game.title}`}
    >
      {content}
    </Link>
  );
}
