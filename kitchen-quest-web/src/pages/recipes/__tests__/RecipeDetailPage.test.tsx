import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeDetailPage } from "../RecipeDetailPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as recipesApi from "../../../api/recipes";
import type { ChildProfile, GroceryList, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
vi.mock("../../../api/recipes");

/**
 * Covers the gap-investigation fix: the backend endpoint and the web API
 * client function for adding a recipe's ingredients to the grocery list
 * both already existed and worked, but no page ever called either --
 * there was no button anywhere. These tests exist specifically to guard
 * against that button silently disappearing or breaking again.
 */

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

const childModeRecipe = {
  _id: "recipe-1",
  title: "Garden Skewers",
  description: "A no-cook recipe",
  gallery: [],
  difficulty: "easy" as const,
  totalTimeMinutes: 10,
  stepCount: 2,
  ageGroups: ["7-9" as const],
  cookingSkills: [],
  funFacts: [],
  xpReward: 30,
  ingredients: [{ name: "Tomato", category: "Produce" }],
  needsGrownUpHelp: false,
  unlocked: true,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/recipes/garden-skewers"]}>
        <AuthProvider>
          <ActiveChildProvider>
            <Routes>
              <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
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
  vi.mocked(recipesApi.getRecipeBySlug).mockResolvedValue(childModeRecipe);
});

const groceryListAfterAdd: GroceryList = {
  _id: "list-1",
  family: "org1",
  status: "active",
  items: [{ _id: "item-1", name: "Tomato", category: "Produce", checked: false, custom: false, sourceRecipes: ["recipe-1"] }],
};

describe("Recipe detail: add to grocery list", () => {
  it("calls the real API with this recipe's id and shows a confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.addRecipeToGroceryList).mockResolvedValue(groceryListAfterAdd);

    renderPage();
    await waitFor(() => expect(screen.getByText("Garden Skewers")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /add ingredients to grocery list/i }));

    expect(recipesApi.addRecipeToGroceryList).toHaveBeenCalledWith("recipe-1");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/added to your grocery list/i));
  });

  it("shows an error message if adding to the grocery list fails, without crashing the page", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.addRecipeToGroceryList).mockRejectedValue(new Error("Network error"));

    renderPage();
    await waitFor(() => expect(screen.getByText("Garden Skewers")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /add ingredients to grocery list/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/network error/i));
    // The rest of the page must still be usable -- this isn't a fatal error.
    expect(screen.getByRole("button", { name: /start cooking/i })).toBeInTheDocument();
  });

  it("does not show the button for a locked recipe", async () => {
    vi.mocked(recipesApi.getRecipeBySlug).mockResolvedValue({ ...childModeRecipe, unlocked: false });

    renderPage();

    await waitFor(() => expect(screen.getByText(/is locked/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /add ingredients to grocery list/i })).not.toBeInTheDocument();
  });
});
