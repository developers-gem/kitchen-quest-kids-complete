import { useState } from "react";
import { Link } from "react-router-dom";
import { LoadingState } from "../../components/LoadingState";
import { getErrorMessage } from "../../lib/errors";
import * as gamesApi from "../../api/games";

/**
 * Shared intro -> play -> results scaffold, extracted from what used to
 * be QuizGameFlow's hardcoded logic so a second gameType (matching)
 * doesn't need to duplicate the start/finish/results orchestration --
 * only the actual gameplay widget and its config shape differ per type.
 */
type FlowStage = "intro" | "playing" | "results";

interface GameFlowProps<TConfig> {
  gameId: string;
  title: string;
  childId: string;
  instructions: string;
  onExit: () => void;
  parseConfig: (rawConfiguration: unknown) => TConfig;
  renderPlayer: (config: TConfig, onFinish: (outcome: Record<string, unknown>) => void) => React.ReactNode;
}

export function GameFlow<TConfig>({ gameId, title, childId, instructions, onExit, parseConfig, renderPlayer }: GameFlowProps<TConfig>) {
  const [stage, setStage] = useState<FlowStage>("intro");
  const [config, setConfig] = useState<TConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<Awaited<ReturnType<typeof gamesApi.completeGameSession>> | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await gamesApi.startGameSession(gameId, childId);
      setSessionId(res.session._id);
      setConfig(parseConfig(res.game.configuration));
      setStage("playing");
    } catch (err) {
      setStartError(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  async function handleFinish(outcome: Record<string, unknown>) {
    if (!sessionId) return;
    const res = await gamesApi.completeGameSession(gameId, sessionId, childId, outcome);
    setResults(res);
    setStage("results");
  }

  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-md text-center">
        <span className="text-5xl" aria-hidden="true">
          🎮
        </span>
        <h1 className="mt-3 text-2xl font-black text-foreground">{title}</h1>
        <p className="mt-2 text-foreground/60">{instructions}</p>
        {startError && (
          <p role="alert" className="mt-4 text-sm font-semibold text-danger">
            {startError}
          </p>
        )}
        <button
          onClick={handleStart}
          disabled={starting}
          className="mt-6 min-h-11 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
        >
          {starting ? "Getting ready..." : "Start"}
        </button>
        <Link to="/games" className="mt-4 block text-sm font-semibold text-foreground/50 hover:underline">
          Maybe later
        </Link>
      </div>
    );
  }

  if (stage === "playing" && config) {
    return <>{renderPlayer(config, handleFinish)}</>;
  }

  if (stage === "results" && results) {
    return <ResultsScreen results={results} onExit={onExit} onPlayAgain={() => setStage("intro")} />;
  }

  return <LoadingState />;
}

function ResultsScreen({
  results,
  onExit,
  onPlayAgain,
}: {
  results: Awaited<ReturnType<typeof gamesApi.completeGameSession>>;
  onExit: () => void;
  onPlayAgain: () => void;
}) {
  const { session, child, newlyEarnedAchievements } = results;

  return (
    <div className="mx-auto max-w-md text-center">
      <span className="text-6xl" aria-hidden="true">
        {session.stars >= 3 ? "🌟" : session.stars > 0 ? "⭐" : "🎉"}
      </span>
      <h1 className="mt-3 text-2xl font-black text-foreground">
        {session.isFirstCompletion ? "Great job!" : "Nice replay!"}
      </h1>
      <p className="mt-1 text-foreground/60">
        {session.score} out of {session.scoreTotal} correct
      </p>

      <div className="mt-6 flex justify-center gap-1 text-3xl text-amber-500" aria-label={`${session.stars} stars`}>
        {Array.from({ length: 3 }, (_, i) => (
          <span key={i} aria-hidden="true">
            {i < session.stars ? "★" : "☆"}
          </span>
        ))}
      </div>

      <div className="mt-6 rounded-3xl bg-surface p-5">
        <p className="text-3xl font-black text-accent">+{session.xpEarned} XP</p>
        {session.dailyCapReached && (
          <p className="mt-1 text-xs text-foreground/50">You've hit today's XP limit for replays -- come back tomorrow!</p>
        )}
        {child.streakIncreased && <p className="mt-2 text-sm font-semibold">🔥 {child.currentStreak}-day streak!</p>}
      </div>

      {newlyEarnedAchievements.length > 0 && (
        <div className="mt-4 rounded-3xl bg-secondary/20 p-4">
          <p className="font-bold text-foreground">New achievement{newlyEarnedAchievements.length > 1 ? "s" : ""}!</p>
          <ul className="mt-1 text-sm text-foreground/70">
            {newlyEarnedAchievements.map((a) => (
              <li key={a._id}>{a.title}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={onPlayAgain} className="min-h-11 flex-1 rounded-full border border-foreground/10 py-3 font-semibold">
          Play again
        </button>
        <button onClick={onExit} className="min-h-11 flex-1 rounded-full bg-primary py-3 font-bold text-primary-foreground">
          Back to Games
        </button>
      </div>
    </div>
  );
}
