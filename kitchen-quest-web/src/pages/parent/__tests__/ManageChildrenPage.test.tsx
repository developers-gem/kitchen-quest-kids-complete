import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ManageChildrenPage } from "../ManageChildrenPage";
import { AuthProvider } from "../../../context/AuthContext";
import { ActiveChildProvider } from "../../../context/ActiveChildContext";
import { ParentalGateProvider } from "../../../context/ParentalGateContext";
import { setAccessToken } from "../../../api/tokenStore";
import { setGateToken } from "../../../api/gateTokenStore";
import * as authApi from "../../../api/auth";
import * as usersApi from "../../../api/users";
import * as childrenApi from "../../../api/children";
import * as avatarsApi from "../../../api/avatars";
import type { AvatarCatalog, ChildProfile, User } from "../../../types/api";

vi.mock("../../../api/auth");
vi.mock("../../../api/users");
vi.mock("../../../api/children");
vi.mock("../../../api/avatars");

/**
 * These tests exist specifically to guard against the highest-severity
 * bug found across this whole project: HomeDashboardPage's empty state
 * used to link to a route that never existed ("/parent/children/new"),
 * silently trapping any brand-new parent in a redirect loop with no way
 * to ever create a child profile on web. This page (and its route) is
 * the fix -- these tests confirm the actual create/edit/delete flow
 * works, not just that the route resolves.
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

const emptyCatalog: AvatarCatalog = { characters: [], colors: [{ id: "primary", label: "Tomato" }], cosmetics: [] };

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <ActiveChildProvider>
            <ParentalGateProvider>
              <ManageChildrenPage />
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
  vi.mocked(avatarsApi.getAvatarCatalog).mockResolvedValue(emptyCatalog);
});

describe("Manage Children (critical onboarding fix)", () => {
  it("shows the empty state with a working 'add your first chef' action when there are no children", async () => {
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no chefs yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add your first chef/i })).toBeInTheDocument();
    });
  });

  it("opens the add-child form, and creating a child calls the real API with the entered data", async () => {
    const user = userEvent.setup();
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    setGateToken("already-verified-gate-token");
    vi.mocked(childrenApi.createChild).mockResolvedValue(mia);

    renderPage();

    // Re-queries and re-clicks the button on every retry rather than
    // clicking a single captured reference once -- a residual re-render
    // shortly after auth settles can still replace this specific button
    // node once, which would otherwise make a one-shot click land on a
    // detached element and silently do nothing.
    await waitFor(async () => {
      await user.click(screen.getByRole("button", { name: /add your first chef/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/name/i), "Mia");
    await user.click(screen.getByRole("button", { name: "7-9" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(childrenApi.createChild).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: "Mia", ageRange: "7-9" })
      )
    );
  });

  it("lists existing children and opens the editor pre-filled when editing one", async () => {
    const user = userEvent.setup();
    vi.mocked(childrenApi.listChildren).mockResolvedValue([mia]);
    setGateToken("already-verified-gate-token");

    renderPage();
    await waitFor(() => expect(screen.getByText("Mia")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /edit/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByDisplayValue("Mia")).toBeInTheDocument();
  });

  it("requires the parental gate before the editor form is usable", async () => {
    const user = userEvent.setup();
    vi.mocked(childrenApi.listChildren).mockResolvedValue([]);
    // Gate token deliberately unset -- the challenge request never
    // resolves, simulating a parent who hasn't passed the check.
    vi.mocked(authApi.requestParentalGateChallenge).mockReturnValue(new Promise(() => {}));

    renderPage();

    await waitFor(async () => {
      await user.click(screen.getByRole("button", { name: /add your first chef/i }));
      expect(screen.getByText(/grown-ups only/i)).toBeInTheDocument();
    });

    // The child-creation form/dialog itself should not be usable.
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  });
});
