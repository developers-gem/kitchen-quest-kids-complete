import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeDashboardPage } from "../HomeDashboardPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as gamesApi from "../../../api/games";
import * as recipesApi from "../../../api/recipes";
import type { ChildProfile, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
vi.mock("../../../api/games");
vi.mock("../../../api/recipes");

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
  currentLevel: 3,
  totalXP: 250,
  currentStreak: 4,
  longestStreak: 6,
  progressStats: {
    gamesPlayed: 10,
    gamesCompleted: 8,
    recipesStarted: 3,
    recipesCompleted: 2,
    foodsTried: 5,
    nutritionQuestsCompleted: 1,
  },
};

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <ActiveChildProvider>
            <HomeDashboardPage />
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
  vi.mocked(gamesApi.listGames).mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 4, total: 0, totalPages: 1 },
  });
  vi.mocked(recipesApi.listRecipes).mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 4, total: 0, totalPages: 1 },
  });
});

describe("Parent Dashboard: Home", () => {
  it("shows an empty state prompting to add a child when the family has none yet", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/no chefs yet/i)).toBeInTheDocument());
    expect(await screen.findByRole("link", { name: /add your first chef/i })).toBeInTheDocument();
  });

  it("renders the active child's greeting, level, XP, and progress stats", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    renderDashboard();

    await waitFor(() => expect(screen.getByText(/hi, chef mia/i)).toBeInTheDocument());
    expect(screen.getByText("LVL 3")).toBeInTheDocument();
    expect(screen.getByText(/4 Days Streak/i)).toBeInTheDocument();
    // Progress stat cards derived straight from progressStats/currentLevel,
    // not hand-typed duplicate numbers -- matches what HomeDashboardPage
    // actually renders: Games Played, Recipes Cooked, Foods Tried, Level.
    expect(screen.getByText(String(mia.progressStats.gamesPlayed))).toBeInTheDocument();
    expect(screen.getByText(String(mia.progressStats.recipesCompleted))).toBeInTheDocument();
    expect(screen.getByText(String(mia.progressStats.foodsTried))).toBeInTheDocument();
  });

  it("shows an honest empty state for featured games/recipes rather than fabricating content", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    renderDashboard();

    await waitFor(() => expect(screen.getByText(/no games available yet/i)).toBeInTheDocument());
    expect(screen.getByText(/no recipes available yet/i)).toBeInTheDocument();
  });

  it("never fabricates a daily challenge when none exists", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/daily challenges are coming soon/i)).toBeInTheDocument());
  });
});
