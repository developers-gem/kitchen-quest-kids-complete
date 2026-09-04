import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FlavorHubPage } from "../FlavorHubPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as regionsApi from "../../../api/regions";
import type { ChildProfile, User, Region } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
vi.mock("../../../api/regions");

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

const newYork: Region = {
  _id: "region-ny",
  name: "New York",
  slug: "new-york",
  scopeType: "usState",
  unlockOrder: 1,
  gameCount: 3,
  unlocked: true,
};
const iowa: Region = {
  _id: "region-iowa",
  name: "Iowa",
  slug: "iowa",
  scopeType: "usState",
  unlockOrder: 2,
  gameCount: 2,
  unlocked: false,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <ActiveChildProvider>
            <FlavorHubPage />
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

describe("Flavor Hub", () => {
  it("shows an empty state when the family has no children", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no chefs yet/i)).toBeInTheDocument());
  });

  it("lists regions with locked/unlocked status for the active child", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    vi.mocked(regionsApi.listRegions).mockResolvedValue([newYork, iowa]);

    renderPage();

    await waitFor(() => expect(screen.getByText("New York")).toBeInTheDocument());
    expect(await screen.findByText("Iowa")).toBeInTheDocument();
    expect(regionsApi.listRegions).toHaveBeenCalledWith(mia._id);
    // The locked region shows locked copy instead of its game count.
    expect(await screen.findByText(/keep playing to unlock/i)).toBeInTheDocument();
  });

  it("shows an honest empty state when no regions exist yet", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    vi.mocked(regionsApi.listRegions).mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(screen.getByText(/no regions available yet/i)).toBeInTheDocument());
  });
});
