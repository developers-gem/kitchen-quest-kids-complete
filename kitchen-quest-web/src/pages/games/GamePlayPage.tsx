import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useActiveChild } from "../../context/ActiveChildContext";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { getErrorMessage } from "../../lib/errors";
import * as gamesApi from "../../api/games";
import { GameFlow } from "./GameFlow";
import { QuizPlayer } from "./QuizPlayer";
import { MatchingPlayer, type MatchingConfig } from "./MatchingPlayer";
import { SortingPlayer, type SortingConfig } from "./SortingPlayer";
import { SequencePlayer, type SequenceConfig } from "./SequencePlayer";
import { MemoryPlayer, type MemoryConfig } from "./MemoryPlayer";
import { DragAndDropPlayer, type DragAndDropConfig } from "./DragAndDropPlayer";
import { IngredientBuilderPlayer, type IngredientBuilderConfig } from "./IngredientBuilderPlayer";
import { TimedChallengePlayer, type TimedChallengeConfig } from "./TimedChallengePlayer";
import { MazePlayer, type MazeConfig } from "./MazePlayer";

/**
 * All 9 gameTypes now have a real, interactive player -- this file's
 * long-standing "flagship + honest gaps" doc comment is retired as of
 * this pass. Kept as a code comment for history: quiz and matching were
 * built first, then sorting, then this pass added sequence, memory,
 * dragAndDrop, ingredientBuilder, timedChallenge, and maze in one sweep.
 * Every player still follows the same rule established from the start:
 * never call startGameSession until we know which player to render, so
 * an unrecognized/future gameType still can't silently increment a
 * child's gamesPlayed stat for a game they couldn't actually play.
 */
const SUPPORTED_GAME_TYPES = [
  "quiz",
  "matching",
  "sorting",
  "sequence",
  "memory",
  "dragAndDrop",
  "ingredientBuilder",
  "timedChallenge",
  "maze",
] as const;

interface QuizConfig {
  questions: { id: string; prompt: string; options: { id: string; text: string }[] }[];
}

export function GamePlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { activeChild } = useActiveChild();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["games", "detail", slug, activeChild?._id],
    queryFn: () => gamesApi.getGameBySlug(slug!, activeChild?._id),
    enabled: Boolean(slug) && Boolean(activeChild),
  });

  if (isLoading || !activeChild) return <LoadingState label="Loading game..." />;
  if (isError) return <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return null;

  if (data.unlocked === false) {
    return (
      <EmptyState
        icon="🔒"
        title={`${data.title} is locked`}
        description="Keep playing and leveling up to unlock this game!"
        action={
          <Link to="/games" className="inline-block min-h-11 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
            Back to Games
          </Link>
        }
      />
    );
  }

  const isSupported = (SUPPORTED_GAME_TYPES as readonly string[]).includes(data.gameType);

  if (!isSupported) {
    // Defensive fallback only -- every gameType the backend's own
    // GAME_TYPES enum defines is now supported above. This still guards
    // against a *future* 10th gameType being added to the backend
    // before its player is built here, so that scenario degrades to an
    // honest message instead of a runtime crash reaching an unmatched
    // branch below.
    return (
      <EmptyState
        icon="🚧"
        title={`${data.title} isn't playable here yet`}
        description={`"${data.gameType}" games need their own interactive experience, coming in a future update.`}
        action={
          <Link to="/games" className="inline-block min-h-11 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
            Back to Games
          </Link>
        }
      />
    );
  }

  const shared = { gameId: data._id, title: data.title, childId: activeChild._id, onExit: () => navigate("/games") };

  switch (data.gameType) {
    case "quiz":
      return (
        <GameFlow<QuizConfig>
          {...shared}
          instructions="Answer every question to earn stars and XP!"
          parseConfig={(raw) => raw as QuizConfig}
          renderPlayer={(config, onFinish) => (
            <QuizPlayer questions={config.questions} onFinish={(answers) => onFinish({ answers })} />
          )}
        />
      );
    case "matching":
      return (
        <GameFlow<MatchingConfig>
          {...shared}
          instructions="Match every card on the left with its partner on the right!"
          parseConfig={(raw) => raw as MatchingConfig}
          renderPlayer={(config, onFinish) => <MatchingPlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "sorting":
      return (
        <GameFlow<SortingConfig>
          {...shared}
          instructions="Sort every card into the correct bin!"
          parseConfig={(raw) => raw as SortingConfig}
          renderPlayer={(config, onFinish) => <SortingPlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "sequence":
      return (
        <GameFlow<SequenceConfig>
          {...shared}
          instructions="Put the steps in the right order!"
          parseConfig={(raw) => raw as SequenceConfig}
          renderPlayer={(config, onFinish) => <SequencePlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "memory":
      return (
        <GameFlow<MemoryConfig>
          {...shared}
          instructions="Flip two cards at a time to find every matching pair!"
          parseConfig={(raw) => raw as MemoryConfig}
          renderPlayer={(config, onFinish) => <MemoryPlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "dragAndDrop":
      return (
        <GameFlow<DragAndDropConfig>
          {...shared}
          instructions="Place every card in the right spot!"
          parseConfig={(raw) => raw as DragAndDropConfig}
          renderPlayer={(config, onFinish) => <DragAndDropPlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "ingredientBuilder":
      return (
        <GameFlow<IngredientBuilderConfig>
          {...shared}
          instructions="Pick out every ingredient that belongs!"
          parseConfig={(raw) => raw as IngredientBuilderConfig}
          renderPlayer={(config, onFinish) => <IngredientBuilderPlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "timedChallenge":
      return (
        <GameFlow<TimedChallengeConfig>
          {...shared}
          instructions="Tap the right ones before time runs out!"
          parseConfig={(raw) => raw as TimedChallengeConfig}
          renderPlayer={(config, onFinish) => <TimedChallengePlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    case "maze":
      return (
        <GameFlow<MazeConfig>
          {...shared}
          instructions="Explore the maze, collect the healthy foods, and find the exit!"
          parseConfig={(raw) => raw as MazeConfig}
          renderPlayer={(config, onFinish) => <MazePlayer config={config} onFinish={(outcome) => onFinish(outcome)} />}
        />
      );
    default:
      return null;
  }
}
