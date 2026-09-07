import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimedChallengePlayer, type TimedChallengeConfig } from "../TimedChallengePlayer";

const config: TimedChallengeConfig = {
  timeLimitSeconds: 30,
  targetCorrectCount: 2,
  items: [
    { id: "item-1", label: "Apple", isCorrect: true },
    { id: "item-2", label: "Candy", isCorrect: false },
  ],
};

describe("TimedChallengePlayer", () => {
  it("renders the countdown and every item, without exposing isCorrect visually", () => {
    render(<TimedChallengePlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByText("30s")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Candy")).toBeInTheDocument();
    // Neither item's label reveals which is correct.
    expect(screen.queryByText(/isCorrect/i)).not.toBeInTheDocument();
  });

  it("toggles selection on tap, and re-tapping deselects", async () => {
    const user = userEvent.setup();
    render(<TimedChallengePlayer config={config} onFinish={vi.fn()} />);

    const apple = screen.getByRole("button", { name: "Apple" });
    await user.click(apple);
    expect(apple).toHaveAttribute("aria-pressed", "true");

    await user.click(apple);
    expect(apple).toHaveAttribute("aria-pressed", "false");
  });

  it("submits the tapped items when 'I'm done' is tapped before time runs out", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<TimedChallengePlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByRole("button", { name: "Apple" }));
    await user.click(screen.getByRole("button", { name: /i'm done/i }));

    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ tappedItemIds: ["item-1"] })
    );
  });

  it("auto-submits once the countdown reaches zero, even with nothing tapped", async () => {
    const onFinish = vi.fn();
    render(<TimedChallengePlayer config={{ ...config, timeLimitSeconds: 1 }} onFinish={onFinish} />);

    await act(() => new Promise((resolve) => setTimeout(resolve, 1300)));

    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ tappedItemIds: [] }));
  }, 10000);
});
