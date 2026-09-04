import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegionDetailPage } from "../RegionDetailPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { setAccessToken } from "../../../api/tokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as regionsApi from "../../../api/regions";
import type { ChildProfile, User } from "../../../types/api";

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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/flavor-hub/new-york"]}>
        <AuthProvider>
          <ActiveChildProvider>
            <Routes>
              <Route path="/flavor-hub/:slug" element={<RegionDetailPage />} />
              <Route path="/games/:slug" element={<div>Game Play Page</div>} />
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

describe("Region detail page", () => {
  it("renders the region name and its games", async () => {
    vi.mocked(regionsApi.getRegionBySlug).mockResolvedValue({
      _id: "region-ny",
      name: "New York",
      slug: "new-york",
      scopeType: "usState",
      unlockOrder: 1,
      gameCount: 1,
      games: [{ _id: "game-1", title: "Big Apple Crunch", slug: "big-apple-crunch", gameType: "quiz" }],
    });

    renderPage();

    await waitFor(() => expect(screen.getByRole("heading", { name: "New York" })).toBeInTheDocument());
    expect(screen.getByText("Big Apple Crunch")).toBeInTheDocument();
    await waitFor(() => expect(regionsApi.getRegionBySlug).toHaveBeenCalledWith("new-york", mia._id));
  });

  it("shows an honest empty state when the region has no games yet", async () => {
    vi.mocked(regionsApi.getRegionBySlug).mockResolvedValue({
      _id: "region-ny",
      name: "New York",
      slug: "new-york",
      scopeType: "usState",
      unlockOrder: 1,
      gameCount: 0,
      games: [],
    });

    renderPage();

    await waitFor(() => expect(screen.getByText(/no games here yet/i)).toBeInTheDocument());
  });

  it("links each game tile to the real game play page (regression: these used to be dead-end, non-interactive tiles)", async () => {
    vi.mocked(regionsApi.getRegionBySlug).mockResolvedValue({
      _id: "region-ny",
      name: "New York",
      slug: "new-york",
      scopeType: "usState",
      unlockOrder: 1,
      gameCount: 1,
      games: [{ _id: "game-1", title: "Big Apple Crunch", slug: "big-apple-crunch", gameType: "quiz" }],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText("Big Apple Crunch")).toBeInTheDocument());

    expect(screen.getByRole("link", { name: /play big apple crunch/i })).toHaveAttribute(
      "href",
      "/games/big-apple-crunch"
    );
  });
});
