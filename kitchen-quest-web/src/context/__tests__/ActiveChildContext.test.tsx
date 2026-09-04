import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../AuthContext";
import { ActiveChildProvider, useActiveChild } from "../ActiveChildContext";
import { setAccessToken } from "../../api/tokenStore";
import * as authApi from "../../api/auth";
import * as usersApi from "../../api/users";
import * as childrenApi from "../../api/children";
import type { ChildProfile, User } from "../../types/api";

vi.mock("../../api/auth");
vi.mock("../../api/users");
vi.mock("../../api/children");

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

function makeChild(overrides: Partial<ChildProfile>): ChildProfile {
  return {
    _id: "child-default",
    familyId: "org1",
    displayName: "Child",
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
    ...overrides,
  };
}

const mia = makeChild({ _id: "child-mia", displayName: "Mia" });
const leo = makeChild({ _id: "child-leo", displayName: "Leo" });

/** A minimal consumer that surfaces exactly the pieces a child-switcher
 * UI needs, so the test exercises the context's real contract rather
 * than reaching into its internals. */
function TestConsumer() {
  const { children, activeChild, setActiveChildId } = useActiveChild();
  return (
    <div>
      <p data-testid="active-child">{activeChild?.displayName ?? "none"}</p>
      {children.map((c) => (
        <button key={c._id} onClick={() => setActiveChildId(c._id)}>
          Switch to {c.displayName}
        </button>
      ))}
    </div>
  );
}

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActiveChildProvider>
          <TestConsumer />
        </ActiveChildProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  localStorage.clear();
  // Simulate an already-logged-in session on page load (the silent
  // refresh AuthProvider attempts on mount succeeds).
  vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: "fake-token", refreshToken: "fake-refresh-token" });
  vi.mocked(usersApi.getMe).mockResolvedValue(fakeUser);
  vi.mocked(childrenApi.listChildren).mockResolvedValue([mia, leo]);
});

describe("Child switching", () => {
  it("defaults to the first child when none has been chosen yet", async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId("active-child")).toHaveTextContent("Mia"));
  });

  it("switches the active child when another child is selected", async () => {
    const user = userEvent.setup();
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId("active-child")).toHaveTextContent("Mia"));

    await user.click(screen.getByRole("button", { name: "Switch to Leo" }));
    await waitFor(() => expect(screen.getByTestId("active-child")).toHaveTextContent("Leo"));
  });

  it("persists the choice to localStorage keyed by the logged-in user's id", async () => {
    const user = userEvent.setup();
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId("active-child")).toHaveTextContent("Mia"));

    await user.click(screen.getByRole("button", { name: "Switch to Leo" }));
    await waitFor(() => expect(localStorage.getItem("kqk.activeChildId.user1")).toBe("child-leo"));
  });

  it("falls back to the first child if the persisted choice no longer exists (e.g. that child was deleted)", async () => {
    localStorage.setItem("kqk.activeChildId.user1", "child-that-was-deleted");
    renderWithProviders();
    // Falls back rather than showing a blank/broken active child.
    await waitFor(() => expect(screen.getByTestId("active-child")).toHaveTextContent("Mia"));
  });
});
