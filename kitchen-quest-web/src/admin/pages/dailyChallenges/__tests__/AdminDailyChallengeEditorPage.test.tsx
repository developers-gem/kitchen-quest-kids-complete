import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminDailyChallengeEditorPage } from "../AdminDailyChallengeEditorPage";
import { adminDailyChallengesApi } from "../../../api/adminDailyChallenges";
import type { AdminDailyChallenge } from "../../../types/contentTypes";

vi.mock("../../../api/adminDailyChallenges");

/**
 * Covers the gap-investigation fix: the backend has had a complete,
 * tested admin module for Daily Challenges since an earlier session,
 * but there was no frontend page to author one at all. These tests
 * guard the create and edit flows against regressing back to that state.
 */

const existingChallenge: AdminDailyChallenge = {
  _id: "challenge-1",
  title: "Play 2 Games Today",
  challengeType: "completeAnyGame",
  target: { count: 2 },
  xpReward: 25,
  dateRange: { startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-07T00:00:00.000Z" },
  applicableAgeGroups: ["4-6", "7-9", "10-12"],
  status: "draft",
  version: 1,
};

function renderPage(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/daily-challenges/:id" element={<AdminDailyChallengeEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Admin: Daily Challenge editor", () => {
  it("creates a new challenge with the entered fields", async () => {
    const user = userEvent.setup();
    vi.mocked(adminDailyChallengesApi.create).mockResolvedValue(existingChallenge);

    renderPage("/admin/daily-challenges/new");
    await waitFor(() => expect(screen.getByText(/new daily challenge/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^title$/i), "Play 2 Games Today");
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() =>
      expect(adminDailyChallengesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Play 2 Games Today", challengeType: "completeAnyGame", target: { count: 1 } })
      )
    );
  });

  it("loads an existing challenge and shows its workflow status", async () => {
    vi.mocked(adminDailyChallengesApi.getById).mockResolvedValue(existingChallenge);

    renderPage("/admin/daily-challenges/challenge-1");

    await waitFor(() => expect(screen.getByDisplayValue("Play 2 Games Today")).toBeInTheDocument());
    expect(screen.getByText(/draft/i)).toBeInTheDocument();
  });

  it("shows a gameId field only for challengeType requiring a specific game", async () => {
    const user = userEvent.setup();
    renderPage("/admin/daily-challenges/new");
    await waitFor(() => expect(screen.getByText(/new daily challenge/i)).toBeInTheDocument());

    expect(screen.queryByLabelText(/game id/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/challenge type/i), "completeSpecificGame");

    expect(screen.getByLabelText(/game id/i)).toBeInTheDocument();
  });

  it("surfaces the backend's validation rejection when saving a specific-game challenge with no gameId (regression: this used to silently succeed and never work)", async () => {
    const user = userEvent.setup();
    vi.mocked(adminDailyChallengesApi.create).mockRejectedValue(
      new Error("target.gameId is required when challengeType is completeSpecificGame")
    );

    renderPage("/admin/daily-challenges/new");
    await waitFor(() => expect(screen.getByText(/new daily challenge/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^title$/i), "Play a specific game");
    await user.selectOptions(screen.getByLabelText(/challenge type/i), "completeSpecificGame");
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/gameId is required/i));
  });
});
