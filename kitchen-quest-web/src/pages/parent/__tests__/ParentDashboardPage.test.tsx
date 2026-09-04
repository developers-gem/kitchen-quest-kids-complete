import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParentDashboardPage } from "../ParentDashboardPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { ParentalGateProvider } from "../../../context/ParentalGateContext";
import { setAccessToken } from "../../../api/tokenStore";
import { setGateToken } from "../../../api/gateTokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as dashboardApi from "../../../api/parentDashboard";
import type { ChildProfile, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
vi.mock("../../../api/parentDashboard");

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
  currentLevel: 2,
  totalXP: 150,
  currentStreak: 3,
  longestStreak: 5,
  progressStats: {
    gamesPlayed: 4,
    gamesCompleted: 4,
    recipesStarted: 1,
    recipesCompleted: 1,
    foodsTried: 2,
    nutritionQuestsCompleted: 0,
  },
};

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <ActiveChildProvider>
            <ParentalGateProvider>
              <ParentDashboardPage />
            </ParentalGateProvider>
          </ActiveChildProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  setGateToken(null);
  localStorage.clear();
  vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "fake-token", refreshToken: "fake-refresh-token" });
  vi.mocked(usersApi.getMe).mockResolvedValue(fakeUser);
  vi.mocked(dashboardApi.getOverview).mockResolvedValue({
    child: { _id: mia._id, displayName: mia.displayName, avatarColor: mia.avatarColor, currentLevel: mia.currentLevel },
    totalActivityCount: 5,
    weeklyXpEarned: 40,
    currentStreak: mia.currentStreak,
    longestStreak: mia.longestStreak,
    totalXP: mia.totalXP,
    recentActivity: [{ type: "game", title: "Big Apple Crunch", date: new Date().toISOString(), xpEarned: 20 }],
  });
});

describe("Parent Dashboard (full)", () => {
  it("shows a locked empty state when the parental gate has not been passed", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    // Gate token deliberately left unset -- ensureGate() will try to open
    // the challenge modal, which never resolves in this test since we
    // don't answer it; the page should not show real data meanwhile.
    vi.mocked(authApi.requestParentalGateChallenge).mockReturnValue(new Promise(() => {}));

    renderDashboard();

    await waitFor(() => expect(screen.getByText(/loading parent dashboard/i)).toBeInTheDocument());
    expect(dashboardApi.getOverview).not.toHaveBeenCalled();
  });

  it("shows real overview data once the parental gate is already satisfied", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    setGateToken("already-verified-gate-token");

    renderDashboard();

    await waitFor(() => expect(screen.getByText(/viewing mia's progress/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Big Apple Crunch")).toBeInTheDocument());
    expect(screen.getByText("150")).toBeInTheDocument(); // totalXP stat card
  });

  it("shows an empty state instead of the gate/dashboard when the family has no children", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    setGateToken("already-verified-gate-token");

    renderDashboard();

    await waitFor(() => expect(screen.getByText(/no chefs yet/i)).toBeInTheDocument());
  });

  it("switches tabs and fetches that tab's own data on demand", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    setGateToken("already-verified-gate-token");
    vi.mocked(dashboardApi.getWeeklySummary).mockResolvedValue({
      weekRange: { start: new Date().toISOString(), end: new Date().toISOString() },
      gamesCompleted: 2,
      recipesCompleted: 1,
      foodsTried: 3,
      nutritionLessonsCompleted: 1,
      totalXPEarned: 55,
      currentStreak: 3,
    });

    renderDashboard();
    await waitFor(() => expect(screen.getByText(/viewing mia's progress/i)).toBeInTheDocument());

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Weekly Summary" }));

    await waitFor(() => expect(dashboardApi.getWeeklySummary).toHaveBeenCalledWith(mia._id));
    await waitFor(() => expect(screen.getByText("55")).toBeInTheDocument());
  });
});
