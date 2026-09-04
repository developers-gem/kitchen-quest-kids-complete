import { request, requestPaginated } from "./client";
import type {
  AgeRange,
  CompleteGameSessionResponse,
  Difficulty,
  GameDetail,
  GameSummary,
  GameType,
  StartGameSessionResponse,
} from "../types/api";

export interface ListGamesParams {
  ageRange?: AgeRange;
  gameType?: GameType;
  difficulty?: Difficulty;
  search?: string;
  childId?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export function listGames(params: ListGamesParams = {}) {
  return requestPaginated<GameSummary[]>("/games", { query: params });
}

export function getGameBySlug(slug: string, childId?: string) {
  return request<GameDetail>(`/games/${slug}`, { query: { childId } });
}

export function startGameSession(gameId: string, childId: string) {
  return request<StartGameSessionResponse>(`/games/${gameId}/start`, { method: "POST", body: { childId } });
}

export function saveGameProgress(
  gameId: string,
  sessionId: string,
  childId: string,
  progress: Record<string, unknown>
) {
  return request<{ sessionId: string; saved: boolean }>(`/games/${gameId}/progress`, {
    method: "POST",
    body: { sessionId, childId, progress },
  });
}

export function completeGameSession(
  gameId: string,
  sessionId: string,
  childId: string,
  outcome: Record<string, unknown>,
  durationSeconds?: number
) {
  return request<CompleteGameSessionResponse>(`/games/${gameId}/complete`, {
    method: "POST",
    body: { sessionId, childId, outcome, durationSeconds },
  });
}
