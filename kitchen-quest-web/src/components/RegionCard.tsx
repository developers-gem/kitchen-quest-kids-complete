import { Link } from "react-router-dom";
import type { Region } from "../types/api";

interface RegionCardProps {
  region: Region & { gameCount?: number };
}

export function RegionCard({ region }: RegionCardProps) {
  const locked = region.unlocked === false;

  const content = (
    <div
      className={`flex flex-col items-center gap-2 rounded-3xl p-6 text-center transition ${
        locked ? "bg-foreground/5 text-foreground/40" : "bg-surface hover:shadow-md"
      }`}
    >
      <span className="text-3xl" aria-hidden="true">
        {locked ? "🔒" : "🗺️"}
      </span>
      <p className="font-bold">{region.name}</p>
      {region.state && <p className="text-xs uppercase tracking-wide text-foreground/40">{region.state}</p>}
      {typeof region.gameCount === "number" && !locked && (
        <p className="text-xs text-foreground/50">
          {region.gameCount} adventure{region.gameCount === 1 ? "" : "s"}
        </p>
      )}
      {locked && <p className="text-xs text-foreground/40">Keep playing to unlock!</p>}
    </div>
  );

  if (locked) {
    return (
      <div aria-disabled="true" aria-label={`${region.name} (locked)`}>
        {content}
      </div>
    );
  }

  return (
    <Link to={`/flavor-hub/${region.slug}`} className="block min-h-11 rounded-3xl focus-visible:outline-primary" aria-label={`Explore ${region.name}`}>
      {content}
    </Link>
  );
}
