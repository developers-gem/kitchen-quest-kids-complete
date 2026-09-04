import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipesListPage } from "../RecipesListPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as recipesApi from "../../../api/recipes";
import type { ChildProfile, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
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
            <RecipesListPage />
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

describe("Recipes list", () => {
  it("shows an empty state when the family has no children", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no chefs yet/i)).toBeInTheDocument());
  });

  it("lists recipes for the active child", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    vi.mocked(recipesApi.listRecipes).mockResolvedValue({
      data: [
        {
          _id: "recipe-1",
          title: "Rainbow Street Tacos",
          slug: "rainbow-street-tacos",
          difficulty: "easy",
          totalTimeMinutes: 20,
          stepCount: 8,
          ageGroups: ["7-9"],
          allergenInformation: [],
          xpReward: 40,
          unlocked: true,
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Rainbow Street Tacos")).toBeInTheDocument());
    expect(recipesApi.listRecipes).toHaveBeenCalledWith(expect.objectContaining({ childId: mia._id }));
  });
});
