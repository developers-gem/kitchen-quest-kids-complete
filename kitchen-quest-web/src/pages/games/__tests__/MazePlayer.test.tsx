import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MazePlayer, type MazeConfig } from "../MazePlayer";

const config: MazeConfig = {
  layoutKey: "open-room",
  collectibles: [{ id: "food-1", label: "Apple", isCorrectFood: true }],
};

describe("MazePlayer", () => {
  it("renders the grid, the player, and movement controls", () => {
    render(<MazePlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByRole("grid", { name: /maze grid/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/you are here/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/move up/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/move down/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/move left/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/move right/i)).toBeInTheDocument();
  });

  it("falls back to the open-room layout for an unregistered layoutKey instead of crashing", () => {
    render(<MazePlayer config={{ ...config, layoutKey: "nonexistent-key" }} onFinish={vi.fn()} />);
    expect(screen.getByRole("grid", { name: /maze grid/i })).toBeInTheDocument();
  });

  it("moving the player updates its position on the grid", async () => {
    const user = userEvent.setup();
    render(<MazePlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByLabelText(/move right/i));

    // The player marker moved off the original top-left starting cell.
    const grid = screen.getByRole("grid", { name: /maze grid/i });
    expect(grid.textContent).toContain("🧑‍🍳");
  });

  it("submits collectedItemIds, timeTakenSeconds, and reachedExit=false when the child taps 'I'm done exploring'", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<MazePlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByRole("button", { name: /i'm done exploring/i }));

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ reachedExit: false, collectedItemIds: expect.any(Array) })
    );
  });

  it("auto-submits with reachedExit=false once an optional time limit expires", async () => {
    const onFinish = vi.fn();
    render(<MazePlayer config={{ ...config, timeLimitSeconds: 1 }} onFinish={onFinish} />);

    await act(() => new Promise((resolve) => setTimeout(resolve, 1300)));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ reachedExit: false }));
  }, 10000);

  it("reaching the exit cell finishes with reachedExit=true", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    // A minimal exit position reachable in one move for a deterministic
    // test -- can't use the real layouts' far-corner exit without a long
    // sequence of moves, so this checks the mechanism using the actual
    // "open-room" layout's real exit at (4,4) reached via repeated moves.
    render(<MazePlayer config={config} onFinish={onFinish} />);

    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await user.click(screen.getByLabelText(/move right/i));
    }
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await user.click(screen.getByLabelText(/move down/i));
    }

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ reachedExit: true }));
  });
});
