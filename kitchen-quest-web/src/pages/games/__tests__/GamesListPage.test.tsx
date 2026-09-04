import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GamesListPage } from "../GamesListPage";
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
      <MemoryRouter>
        <AuthProvider>
          <ActiveChildProvider>
            <GamesListPage />
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
});

describe("Games list", () => {
  it("shows an empty state when the family has no children", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no chefs yet/i)).toBeInTheDocument());
  });

  it("lists games with locked/unlocked status and star counts", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    vi.mocked(gamesApi.listGames).mockResolvedValue({
      data: [
        {
          _id: "game-1",
          title: "Big Apple Crunch",
          slug: "big-apple-crunch",
          gameType: "quiz",
          ageGroups: ["7-9"],
          difficulty: "easy",
          nutritionTopics: [],
          foodTopics: [],
          xpReward: 20,
          maxStars: 3,
          unlocked: true,
          bestStars: 2,
        },
        {
          _id: "game-2",
          title: "Locked Game",
          slug: "locked-game",
          gameType: "quiz",
          ageGroups: ["7-9"],
          difficulty: "easy",
          nutritionTopics: [],
          foodTopics: [],
          xpReward: 20,
          maxStars: 3,
          unlocked: false,
        },
      ],
      meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Big Apple Crunch")).toBeInTheDocument());
    expect(screen.getByText("Locked Game")).toBeInTheDocument();
    expect(gamesApi.listGames).toHaveBeenCalledWith(
      expect.objectContaining({ childId: mia._id, limit: 50 })
    );
  });

  it("shows an empty state when no games match", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    vi.mocked(gamesApi.listGames).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 50, total: 0, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/no games found/i)).toBeInTheDocument());
  });
});
