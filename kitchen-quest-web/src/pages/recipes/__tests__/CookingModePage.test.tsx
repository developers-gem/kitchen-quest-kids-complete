import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookingModePage } from "../CookingModePage";
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
      <MemoryRouter initialEntries={["/recipes/garden-skewers/cook"]}>
        <AuthProvider>
          <ActiveChildProvider>
            <Routes>
              <Route path="/recipes/:slug/cook" element={<CookingModePage />} />
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

describe("Cooking mode flow", () => {
  it("walks through both steps and shows the XP celebration screen on finish (no verification required)", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.startCooking).mockResolvedValue({
      progress: { _id: "progress-1", status: "inProgress", currentStepIndex: 0 },
      recipe: childModeRecipe,
      currentStep: { stepNumber: 1, totalSteps: 2, title: "Wash", instruction: "Wash the veggies", needsGrownUp: false },
      readyToComplete: false,
    });
    vi.mocked(recipesApi.advanceStep).mockResolvedValue({
      progress: { _id: "progress-1", status: "inProgress", currentStepIndex: 1 },
      currentStep: { stepNumber: 2, totalSteps: 2, title: "Skewer", instruction: "Put them on a stick", needsGrownUp: false },
      readyToComplete: false,
    });
    vi.mocked(recipesApi.completeCooking).mockResolvedValue({
      progress: { _id: "progress-1", status: "completed", xpEarned: 30, isFirstCompletion: true, pendingParentVerification: false },
      newlyEarnedAchievements: [],
      dailyChallenge: { matched: false, justCompleted: false, xpAwarded: 0 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Wash")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /next step/i }));

    await waitFor(() => expect(screen.getByText("Skewer")).toBeInTheDocument());
    expect(recipesApi.advanceStep).toHaveBeenCalledWith("progress-1", mia._id);

    // advanceStep's mock didn't set readyToComplete, so we need the
    // second advance call's response to flip it -- simulate via a second
    // mock resolution for the same call if the component calls advance
    // again; here the UI shows "Next Step" until told otherwise, so
    // exercise the real completion path by re-mocking advanceStep to
    // report readyToComplete on this second click.
    vi.mocked(recipesApi.advanceStep).mockResolvedValueOnce({
      progress: { _id: "progress-1", status: "inProgress", currentStepIndex: 2 },
      currentStep: null,
      readyToComplete: true,
    });
    await user.click(screen.getByRole("button", { name: /next step/i }));

    await waitFor(() => expect(screen.getByText(/all steps done/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /finish cooking/i }));

    await waitFor(() => expect(screen.getByText(/you did it/i)).toBeInTheDocument());
    expect(screen.getByText("+30 XP")).toBeInTheDocument();
  });

  it("shows a waiting-for-a-grown-up state when the recipe requires parent verification", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.startCooking).mockResolvedValue({
      progress: { _id: "progress-1", status: "inProgress", currentStepIndex: 0 },
      recipe: childModeRecipe,
      currentStep: null,
      readyToComplete: true,
    });
    vi.mocked(recipesApi.completeCooking).mockResolvedValue({
      progress: { _id: "progress-1", status: "completed", xpEarned: 0, isFirstCompletion: true, pendingParentVerification: true },
      newlyEarnedAchievements: [],
      dailyChallenge: { matched: false, justCompleted: false, xpAwarded: 0 },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/all steps done/i)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /finish cooking/i }));

    await waitFor(() => expect(screen.getByText(/ask a grown-up to confirm/i)).toBeInTheDocument());
  });

  it("never crashes when resuming a session that was already fully stepped through (the backend bugfix's client-side counterpart)", async () => {
    // This directly exercises what the real bug used to do to a client:
    // startCooking returning currentStep: null with readyToComplete true
    // must render the finish prompt, not attempt to read
    // currentStep.title and crash.
    vi.mocked(recipesApi.startCooking).mockResolvedValue({
      progress: { _id: "progress-1", status: "inProgress", currentStepIndex: 2 },
      recipe: childModeRecipe,
      currentStep: null,
      readyToComplete: true,
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/all steps done/i)).toBeInTheDocument());
  });
});
