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

/**
 * FLAGSHIP + HONEST GAPS, same pattern as the admin panel's Games editor:
 * "quiz" and "matching" are the two gameTypes with a real, complete,
 * interactive player built here. The other 7 (sorting, memory, sequence,
 * dragAndDrop, maze, ingredientBuilder, timedChallenge) each need their
 * own bespoke interaction pattern -- a drag surface, a memory-flip grid,
 * a maze renderer -- which is real, substantial UI work per type, not
 * something to fake with a shared generic component. Rather than build
 * one properly and silently stub the rest with something that *looks*
 * like a game, unsupported types show an honest "not playable here yet"
 * message and never start a session (so a child's gamesPlayed count
 * isn't incremented for a game they were never actually able to play).
 */
const SUPPORTED_GAME_TYPES = ["quiz", "matching"] as const;

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
    return (
      <EmptyState
        icon="🚧"
        title={`${data.title} isn't playable here yet`}
        description={`"${data.gameType}" games need their own interactive experience, coming in a future update. Quiz and matching games are ready to play now!`}
        action={
          <Link to="/games" className="inline-block min-h-11 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
            Back to Games
          </Link>
        }
      />
    );
  }

  const shared = { gameId: data._id, title: data.title, childId: activeChild._id, onExit: () => navigate("/games") };

  if (data.gameType === "quiz") {
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
  }

  return (
    <GameFlow<MatchingConfig>
      {...shared}
      instructions="Match every card on the left with its partner on the right!"
      parseConfig={(raw) => raw as MatchingConfig}
      renderPlayer={(config, onFinish) => (
        <MatchingPlayer config={config} onFinish={(outcome) => onFinish(outcome)} />
      )}
    />
  );
}
