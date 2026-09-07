import { useEffect, useMemo, useRef, useState } from "react";

interface MazeCollectible {
  id: string;
  label: string;
  isCorrectFood: boolean;
}

export interface MazeConfig {
  layoutKey: string;
  collectibles: MazeCollectible[];
  timeLimitSeconds?: number;
}

interface MazePlayerProps {
  config: MazeConfig;
  onFinish: (outcome: { collectedItemIds: string[]; timeTakenSeconds: number; reachedExit: boolean }) => void | Promise<void>;
}

type Cell = { x: number; y: number };

interface MazeLayout {
  width: number;
  height: number;
  walls: string[]; // "x,y" strings
  start: Cell;
  exit: Cell;
}

/**
 * `configuration.layoutKey` only ever "references a client-side maze
 * layout asset" (gameType.schemas.js's own comment) -- the backend
 * intentionally does not ship grid/wall data, only a string key. This is
 * a small hand-authored registry of actual layouts, with a fully-open
 * fallback grid for any key that doesn't match one (so an admin typing
 * an unregistered key never breaks the game, just gets a plain open
 * room instead of a maze with walls). Collectibles from `config` are
 * placed onto the layout's open cells once per session (useMemo, not
 * re-randomized every render) since the config itself carries no
 * per-collectible position -- that mapping is a client-only concern.
 */
const LAYOUTS: Record<string, MazeLayout> = {
  "simple-cross": {
    width: 5,
    height: 5,
    walls: ["1,1", "1,3", "3,1", "3,3"],
    start: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
  },
  "open-room": {
    width: 5,
    height: 5,
    walls: [],
    start: { x: 0, y: 0 },
    exit: { x: 4, y: 4 },
  },
};
const FALLBACK_LAYOUT: MazeLayout = LAYOUTS["open-room"];

function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

export function MazePlayer({ config, onFinish }: MazePlayerProps) {
  const layout = LAYOUTS[config.layoutKey] ?? FALLBACK_LAYOUT;
  const wallSet = useMemo(() => new Set(layout.walls), [layout]);

  const collectiblePositions = useMemo(() => {
    const openCells: Cell[] = [];
    for (let y = 0; y < layout.height; y += 1) {
      for (let x = 0; x < layout.width; x += 1) {
        const isStartOrExit = (x === layout.start.x && y === layout.start.y) || (x === layout.exit.x && y === layout.exit.y);
        if (!wallSet.has(cellKey(x, y)) && !isStartOrExit) openCells.push({ x, y });
      }
    }
    // Deterministic-enough shuffle for placement -- this doesn't need to
    // be cryptographically random, just different from config order.
    const shuffled = [...openCells].sort(() => Math.random() - 0.5);
    const positions = new Map<string, MazeCollectible>();
    config.collectibles.forEach((item, i) => {
      const cell = shuffled[i % shuffled.length];
      positions.set(cellKey(cell.x, cell.y), item);
    });
    return positions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, config.collectibles]);

  const [playerPos, setPlayerPos] = useState<Cell>(layout.start);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [reachedExit, setReachedExit] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(config.timeLimitSeconds ?? null);
  const [submitting, setSubmitting] = useState(false);
  const hasFinishedRef = useRef(false);
  const startTime = useRef(Date.now());

  async function finish(exitReached: boolean) {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setSubmitting(true);
    const timeTakenSeconds = Math.round((Date.now() - startTime.current) / 1000);
    await onFinish({ collectedItemIds: Array.from(collectedIds), timeTakenSeconds, reachedExit: exitReached });
  }

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      finish(false);
      return;
    }
    const timeout = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function move(dx: number, dy: number) {
    if (hasFinishedRef.current) return;
    setPlayerPos((prev) => {
      const next = { x: prev.x + dx, y: prev.y + dy };
      if (next.x < 0 || next.x >= layout.width || next.y < 0 || next.y >= layout.height) return prev;
      if (wallSet.has(cellKey(next.x, next.y))) return prev;

      const collectible = collectiblePositions.get(cellKey(next.x, next.y));
      if (collectible) {
        setCollectedIds((prevIds) => new Set(prevIds).add(collectible.id));
      }
      return next;
    });
  }

  // Reaching the exit is detected here, as a genuine effect of playerPos
  // changing, rather than calling the async finish() from inside the
  // setPlayerPos updater above -- updater functions should stay pure and
  // synchronous; triggering a side effect (state updates + an awaited
  // API call) from inside one is fragile and not something React
  // guarantees runs exactly once.
  useEffect(() => {
    if (playerPos.x === layout.exit.x && playerPos.y === layout.exit.y) {
      setReachedExit(true);
      finish(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos]);

  return (
    <div className="mx-auto max-w-md">
      {secondsLeft !== null && (
        <p className={`mb-2 text-center text-2xl font-black ${secondsLeft <= 5 ? "text-danger" : "text-foreground"}`}>
          {secondsLeft}s
        </p>
      )}
      <p className="mb-4 text-center text-sm text-foreground/60">
        Collected: {collectedIds.size} {reachedExit && "-- You reached the exit!"}
      </p>

      <div
        className="mx-auto grid gap-1"
        style={{ gridTemplateColumns: `repeat(${layout.width}, minmax(0, 1fr))`, maxWidth: 280 }}
        role="grid"
        aria-label="Maze grid"
      >
        {Array.from({ length: layout.height }, (_, y) =>
          Array.from({ length: layout.width }, (_, x) => {
            const isWall = wallSet.has(cellKey(x, y));
            const isPlayer = playerPos.x === x && playerPos.y === y;
            const isExit = layout.exit.x === x && layout.exit.y === y;
            const collectibleHere = collectiblePositions.get(cellKey(x, y));
            const isCollected = collectibleHere && collectedIds.has(collectibleHere.id);
            return (
              <div
                key={cellKey(x, y)}
                role="gridcell"
                aria-label={isPlayer ? "You are here" : isExit ? "Exit" : isWall ? "Wall" : "Open path"}
                className={`flex aspect-square items-center justify-center rounded-md text-lg ${
                  isWall ? "bg-foreground/30" : isExit ? "bg-accent/30" : "bg-foreground/5"
                }`}
              >
                {isPlayer ? "🧑‍🍳" : collectibleHere && !isCollected ? "🍎" : isExit ? "🚪" : ""}
              </div>
            );
          })
        )}
      </div>

      <div className="mx-auto mt-6 grid w-40 grid-cols-3 gap-2">
        <div />
        <button onClick={() => move(0, -1)} aria-label="Move up" className="min-h-11 rounded-2xl bg-surface font-bold">
          ↑
        </button>
        <div />
        <button onClick={() => move(-1, 0)} aria-label="Move left" className="min-h-11 rounded-2xl bg-surface font-bold">
          ←
        </button>
        <button onClick={() => move(0, 1)} aria-label="Move down" className="min-h-11 rounded-2xl bg-surface font-bold">
          ↓
        </button>
        <button onClick={() => move(1, 0)} aria-label="Move right" className="min-h-11 rounded-2xl bg-surface font-bold">
          →
        </button>
      </div>

      {!hasFinishedRef.current && (
        <button
          onClick={() => finish(false)}
          disabled={submitting}
          className="mt-6 min-h-11 w-full rounded-full border border-foreground/10 py-3 font-semibold disabled:opacity-40"
        >
          {submitting ? "Checking..." : "I'm done exploring"}
        </button>
      )}
    </div>
  );
}
