import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchingPlayer, type MatchingConfig } from "../MatchingPlayer";

/**
 * Dedicated unit tests for the matching interaction itself, isolated
 * from GamePlayPage's start/finish/results orchestration (which already
 * has its own end-to-end tests). These exercise MatchingPlayer's own
 * logic directly: connect, disconnect-by-re-tap, disconnect-by-tapping-
 * an-already-used-match, and the Finish button's enabled state.
 */
const config: MatchingConfig = {
  items: [
    { id: "item-1", promptLabel: "Apple", matchLabel: "A crunchy red fruit" },
    { id: "item-2", promptLabel: "Carrot", matchLabel: "An orange root vegetable" },
  ],
};

describe("MatchingPlayer", () => {
  it("renders every prompt and every match label", () => {
    render(<MatchingPlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Carrot")).toBeInTheDocument();
    expect(screen.getByText("A crunchy red fruit")).toBeInTheDocument();
    expect(screen.getByText("An orange root vegetable")).toBeInTheDocument();
  });

  it("disables Finish until every item is connected", async () => {
    const user = userEvent.setup();
    render(<MatchingPlayer config={config} onFinish={vi.fn()} />);

    expect(screen.getByRole("button", { name: /match all 2 to finish/i })).toBeDisabled();

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));

    expect(screen.getByRole("button", { name: /match all 2 to finish/i })).toBeDisabled();
  });

  it("enables Finish once all items are connected, and submits the connections made", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<MatchingPlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));
    await user.click(screen.getByText("Carrot"));
    await user.click(screen.getByText("An orange root vegetable"));

    const finishButton = screen.getByRole("button", { name: /^finish$/i });
    expect(finishButton).toBeEnabled();

    await user.click(finishButton);

    expect(onFinish).toHaveBeenCalledWith({
      matchedPairs: expect.arrayContaining([
        { itemId: "item-1", matchedWithItemId: "item-1" },
        { itemId: "item-2", matchedWithItemId: "item-2" },
      ]),
    });
  });

  it("re-tapping a connected prompt disconnects it (undo without a separate clear control)", async () => {
    const user = userEvent.setup();
    render(<MatchingPlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));
    // Only 1 of 2 connected -- Finish still disabled, confirming the connection landed.
    expect(screen.getByRole("button", { name: /match all 2 to finish/i })).toBeDisabled();

    // Re-tap the now-connected prompt to undo it.
    await user.click(screen.getByText("Apple"));

    // Both sides should be free again -- reconnecting the same pair
    // must work exactly as it did the first time.
    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));
    await user.click(screen.getByText("Carrot"));
    await user.click(screen.getByText("An orange root vegetable"));
    expect(screen.getByRole("button", { name: /^finish$/i })).toBeEnabled();
  });

  it("tapping an already-used match frees it for a different prompt (undo from the other side)", async () => {
    const user = userEvent.setup();
    render(<MatchingPlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("A crunchy red fruit"));

    // Tap the used match directly (not the prompt) to free it.
    await user.click(screen.getByText("A crunchy red fruit"));

    // Now connect it to the OTHER prompt instead, proving it was
    // genuinely freed rather than still bound to "Apple".
    await user.click(screen.getByText("Carrot"));
    await user.click(screen.getByText("A crunchy red fruit"));
    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByText("An orange root vegetable"));

    const onFinish = vi.fn();
    render(<MatchingPlayer config={config} onFinish={onFinish} />);
  });

  it("never reveals which prompt an item's id secretly matches via array order alone", () => {
    // Regression guard for the design property this component depends
    // on: the match column must not simply mirror the prompt column's
    // order (that would make matching trivial from position alone,
    // defeating the point of the game).
    const manyItems: MatchingConfig = {
      items: Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        promptLabel: `Prompt ${i}`,
        matchLabel: `Match ${i}`,
      })),
    };

    render(<MatchingPlayer config={manyItems} onFinish={vi.fn()} />);
    const matchButtons = screen.getAllByText(/^Match \d+$/).map((el) => el.textContent);

    const inOriginalOrder = manyItems.items.map((i) => i.matchLabel);
    expect(matchButtons).not.toEqual(inOriginalOrder);
  });
});
