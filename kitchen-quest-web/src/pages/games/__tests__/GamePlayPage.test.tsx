import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GamePlayPage } from "../GamePlayPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as gamesApi from "../../../api/games";
import type { ChildProfile, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
vi.mock("../../../api/games");

const fakeUser: User = {
  _id: "user1",
  role: ["parent"],
  firstName: "Jamie",
  lastName: "Rivera",
  email: "jamie@example.com",
  emailVerified: true,
  status: "active",
  organizationId: "org1",
  notificationPreferences: [],
};

const mia: ChildProfile = {
  _id: "child-mia",
  familyId: "org1",
  displayName: "Mia",
  ageRange: "7-9",
  avatarColor: "primary",
  currentLevel: 1,
  totalXP: 0,
  currentStreak: 0,
  longestStreak: 0,
  progressStats: {
    gamesPlayed: 0,
    gamesCompleted: 0,
    recipesStarted: 0,
    recipesCompleted: 0,
    foodsTried: 0,
    nutritionQuestsCompleted: 0,
  },
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/games/big-apple-crunch"]}>
        <AuthProvider>
          <ActiveChildProvider>
            <Routes>
              <Route path="/games/:slug" element={<GamePlayPage />} />
              <Route path="/games" element={<div>Games List Page</div>} />
            </Routes>
          </ActiveChildProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  localStorage.clear();
  vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "fake-token", refreshToken: "fake-refresh-token" });
  vi.mocked(usersApi.getMe).mockResolvedValue(fakeUser);
  vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
});

const baseGameDetail = {
  _id: "game-1",
  title: "Big Apple Crunch",
  slug: "big-apple-crunch",
  gameType: "quiz" as const,
  ageGroups: ["7-9" as const],
  difficulty: "easy" as const,
  nutritionTopics: [],
  foodTopics: [],
  xpReward: 20,
  maxStars: 3,
  learningObjectives: [],
};

describe("Game play flow (quiz)", () => {
  it("shows a locked message and never starts a session for a locked game", async () => {
    vi.mocked(gamesApi.getGameBySlug).mockResolvedValue({ ...baseGameDetail, unlocked: false });

    renderPage();

    await waitFor(() => expect(screen.getByText(/is locked/i)).toBeInTheDocument());
    expect(gamesApi.startGameSession).not.toHaveBeenCalled();
  });

  it("shows an honest 'not playable yet' message for unsupported game types, without starting a session", async () => {
    vi.mocked(gamesApi.getGameBySlug).mockResolvedValue({ ...baseGameDetail, gameType: "sorting", unlocked: true });

    renderPage();

    await waitFor(() => expect(screen.getByText(/isn't playable here yet/i)).toBeInTheDocument());
    expect(gamesApi.startGameSession).not.toHaveBeenCalled();
  });

  it("plays a full quiz end-to-end: start -> answer -> finish -> results", async () => {
    const user = userEvent.setup();
    vi.mocked(gamesApi.getGameBySlug).mockResolvedValue({ ...baseGameDetail, unlocked: true });
    vi.mocked(gamesApi.startGameSession).mockResolvedValue({
      session: { _id: "session-1", status: "inProgress", startedAt: new Date().toISOString() },
      game: {
        _id: "game-1",
        title: "Big Apple Crunch",
        gameType: "quiz",
        maxStars: 3,
        configuration: {
          questions: [
            { id: "q1", prompt: "Which is a fruit?", options: [{ id: "a", text: "Apple" }, { id: "b", text: "Carrot" }] },
          ],
        },
      },
    });
    vi.mocked(gamesApi.completeGameSession).mockResolvedValue({
      session: {
        _id: "session-1",
        status: "completed",
        score: 1,
        scoreTotal: 1,
        stars: 3,
        xpEarned: 20,
        completionRank: 1,
        isFirstCompletion: true,
        dailyCapReached: false,
      },
      child: { totalXP: 20, currentLevel: 1, currentStreak: 1, streakIncreased: true },
      newlyEarnedAchievements: [],
      dailyChallenge: { matched: false, justCompleted: false, xpAwarded: 0 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByRole("button", { name: /^start$/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^start$/i }));

    await waitFor(() => expect(screen.getByText("Which is a fruit?")).toBeInTheDocument());
    await user.click(screen.getByRole("radio", { name: "Apple" }));
    await user.click(screen.getByRole("button", { name: /finish/i }));

    expect(gamesApi.completeGameSession).toHaveBeenCalledWith(
      "game-1",
      "session-1",
      mia._id,
      { answers: [{ questionId: "q1", selectedOptionId: "a" }] }
    );

    await waitFor(() => expect(screen.getByText(/great job/i)).toBeInTheDocument());
    expect(screen.getByText("+20 XP")).toBeInTheDocument();
    expect(screen.getByText(/1-day streak/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to games/i }));
    await waitFor(() => expect(screen.getByText("Games List Page")).toBeInTheDocument());
  });

  it("plays a full matching game end-to-end: start -> connect all pairs -> finish -> results", async () => {
    const user = userEvent.setup();
    vi.mocked(gamesApi.getGameBySlug).mockResolvedValue({ ...baseGameDetail, gameType: "matching", unlocked: true });
    vi.mocked(gamesApi.startGameSession).mockResolvedValue({
      session: { _id: "session-2", status: "inProgress", startedAt: new Date().toISOString() },
      game: {
        _id: "game-1",
        title: "Big Apple Crunch",
        gameType: "matching",
        maxStars: 3,
        configuration: {
          items: [
            { id: "item-1", promptLabel: "Apple", matchLabel: "A crunchy red fruit" },
            { id: "item-2", promptLabel: "Carrot", matchLabel: "An orange root vegetable" },
          ],
        },
      },
    });
    vi.mocked(gamesApi.completeGameSession).mockResolvedValue({
      session: {
        _id: "session-2",
        status: "completed",
        score: 2,
        scoreTotal: 2,
        stars: 3,
        xpEarned: 20,
        completionRank: 1,
        isFirstCompletion: true,
        dailyCapReached: false,
      },
      child: { totalXP: 20, currentLevel: 1, currentStreak: 1, streakIncreased: false },
      newlyEarnedAchievements: [],
      dailyChallenge: { matched: false, justCompleted: false, xpAwarded: 0 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByRole("button", { name: /^start$/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^start$/i }));

    await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
    // Connect each prompt to its correct match by id -- the labels are
    // deliberately different strings, so this also proves the UI never
    // leans on positional order to establish correctness.
    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));
    await user.click(screen.getByText("Carrot"));
    await user.click(screen.getByText("An orange root vegetable"));

    await user.click(screen.getByRole("button", { name: /finish/i }));

    expect(gamesApi.completeGameSession).toHaveBeenCalledWith("game-1", "session-2", mia._id, {
      matchedPairs: expect.arrayContaining([
        { itemId: "item-1", matchedWithItemId: "item-1" },
        { itemId: "item-2", matchedWithItemId: "item-2" },
      ]),
    });

    await waitFor(() => expect(screen.getByText(/great job/i)).toBeInTheDocument());
    expect(screen.getByText("+20 XP")).toBeInTheDocument();
  });

  it("disables Finish until every matching item has been connected", async () => {
    const user = userEvent.setup();
    vi.mocked(gamesApi.getGameBySlug).mockResolvedValue({ ...baseGameDetail, gameType: "matching", unlocked: true });
    vi.mocked(gamesApi.startGameSession).mockResolvedValue({
      session: { _id: "session-3", status: "inProgress", startedAt: new Date().toISOString() },
      game: {
        _id: "game-1",
        title: "Big Apple Crunch",
        gameType: "matching",
        maxStars: 3,
        configuration: {
          items: [
            { id: "item-1", promptLabel: "Apple", matchLabel: "A crunchy red fruit" },
            { id: "item-2", promptLabel: "Carrot", matchLabel: "An orange root vegetable" },
          ],
        },
      },
    });

    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /^start$/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^start$/i }));

    await waitFor(() => expect(screen.getByText("Apple")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /match all 2 to finish/i })).toBeDisabled();

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));

    // Still only 1 of 2 connected -- finish must stay disabled.
    expect(screen.getByRole("button", { name: /match all 2 to finish/i })).toBeDisabled();
    expect(gamesApi.completeGameSession).not.toHaveBeenCalled();
  });
});
