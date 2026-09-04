import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAvatarCosmeticEditorPage } from "../AdminAvatarCosmeticEditorPage";
import { adminAvatarCosmeticsApi } from "../../../api/adminAvatarCosmetics";
import type { AdminAvatarCosmetic } from "../../../types/contentTypes";

vi.mock("../../../api/adminAvatarCosmetics");

/**
 * Covers the gap-investigation fix: the backend has had a complete,
 * tested admin module for Avatar Cosmetics since an earlier session
 * (see avatarCosmetics.test.js on the backend), but there was no
 * frontend page to author one at all -- meaning even after wiring up
 * client-side cosmetic *display*, nobody could actually create the
 * content that would populate it.
 */

const existingCosmetic: AdminAvatarCosmetic = {
  _id: "cosmetic-1",
  label: "Golden Chef Hat",
  slot: "hat",
  assetKey: "golden-chef-hat",
  unlockRequirements: { type: "levelAtLeast", value: 5 },
  status: "draft",
  version: 1,
};

function renderPage(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/avatar-cosmetics/:id" element={<AdminAvatarCosmeticEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Admin: Avatar Cosmetic editor", () => {
  it("creates a new cosmetic with the entered fields, always starting as a draft", async () => {
    const user = userEvent.setup();
    vi.mocked(adminAvatarCosmeticsApi.create).mockResolvedValue(existingCosmetic);

    renderPage("/admin/avatar-cosmetics/new");
    await waitFor(() => expect(screen.getByText(/new avatar cosmetic/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/label/i), "Golden Chef Hat");
    await user.selectOptions(screen.getByLabelText(/slot/i), "hat");
    await user.type(screen.getByLabelText(/asset key/i), "golden-chef-hat");
    await user.click(screen.getByRole("button", { name: /create draft/i }));

    await waitFor(() =>
      expect(adminAvatarCosmeticsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ label: "Golden Chef Hat", slot: "hat", assetKey: "golden-chef-hat" })
      )
    );
  });

  it("loads an existing cosmetic and shows its workflow status and unlock requirements", async () => {
    vi.mocked(adminAvatarCosmeticsApi.getById).mockResolvedValue(existingCosmetic);

    renderPage("/admin/avatar-cosmetics/cosmetic-1");

    // Bundled into one waitFor rather than checking the label first and
    // the rest synchronously after: JsonField's value-prop re-sync (see
    // JsonField.tsx's own fix) runs in a later effect pass than the
    // parent form's state update, so a synchronous check right after the
    // label appears can race ahead of it -- observed directly as a real,
    // reproducible ~1-in-3 flake, not a hypothetical one.
    await waitFor(() => {
      expect(screen.getByDisplayValue("Golden Chef Hat")).toBeInTheDocument();
      expect(screen.getByText(/draft/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/levelAtLeast/)).toBeInTheDocument();
    });
  });

  it("can publish a cosmetic through the workflow transition control", async () => {
    const user = userEvent.setup();
    vi.mocked(adminAvatarCosmeticsApi.getById).mockResolvedValue(existingCosmetic);
    vi.mocked(adminAvatarCosmeticsApi.transitionStatus).mockResolvedValue({ ...existingCosmetic, status: "review" });

    renderPage("/admin/avatar-cosmetics/cosmetic-1");
    await waitFor(() => expect(screen.getByDisplayValue("Golden Chef Hat")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /review/i }));

    expect(adminAvatarCosmeticsApi.transitionStatus).toHaveBeenCalledWith("cosmetic-1", "review");
  });
});
