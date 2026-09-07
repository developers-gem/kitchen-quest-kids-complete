import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryPlayer, type MemoryConfig } from "../MemoryPlayer";

const config: MemoryConfig = {
  pairs: [
    { id: "pair-1", label: "Apple" },
    { id: "pair-2", label: "Banana" },
  ],
};

// The mismatch-flip-back delay is a real 800ms setTimeout in the
// component. Mixing userEvent with vitest's fake timers is a known
// fragile combination (userEvent's own internal waits can deadlock
// against them), so these tests use real timers and a real short wait
// instead -- slower, but reliable. Wrapped in act() since the delay
// resolves with a React state update (the flip-back) that doesn't go
// through userEvent's own act-wrapping.
function wait(ms: number) {
  return act(() => new Promise((resolve) => setTimeout(resolve, ms)));
}

describe("MemoryPlayer", () => {
  it("renders one face-down card per pair-side (4 cards for 2 pairs), none showing their label", () => {
    render(<MemoryPlayer config={config} onFinish={vi.fn()} />);
    const cards = screen.getAllByRole("button");
    expect(cards).toHaveLength(4);
    expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
  });

  it("flipping two matching cards keeps them face-up and counts as a match", async () => {
    // Same determinism fix as the mismatch test below: with Math.random()
    // mocked to 0, the shuffle for this 2-pair deck resolves to
    // [Apple, Banana, Banana, Apple] -- so index 0 and index 3 are
    // guaranteed to be the true match, replacing a fragile trial-and-
    // error search that occasionally picked the real match by luck on
    // its first guess and failed the rest of the time when it didn't.
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    render(<MemoryPlayer config={config} onFinish={vi.fn()} />);
    randomSpy.mockRestore();

    const cards = screen.getAllByRole("button");
    await user.click(cards[0]);
    await user.click(cards[3]);

    expect(screen.getByText(/matches: 1 \/ 2/i)).toBeInTheDocument();
  }, 10000);

  it("flipping two mismatched cards flips them back face-down after a short delay", async () => {
    // The deck is genuinely shuffled with Math.random() -- picking "the
    // second card" without controlling that shuffle risks occasionally
    // picking the TRUE match by chance, silently testing the wrong
    // scenario. Mocking Math.random() to a constant makes the Fisher-
    // Yates shuffle deterministic: every swap targets index 0, which for
    // a 2-pair deck ([Apple-a, Apple-b, Banana-a, Banana-b]) works out to
    // a final order of [Apple, Banana, Banana, Apple] -- so index 0 and
    // index 1 are guaranteed to be a genuine mismatch.
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup();
    render(<MemoryPlayer config={config} onFinish={vi.fn()} />);
    randomSpy.mockRestore();

    const cards = screen.getAllByRole("button");
    await user.click(cards[0]);
    await user.click(cards[1]);

    // Briefly both show their labels...
    expect(cards[0].getAttribute("aria-label")).not.toBe("Face-down card");
    expect(cards[0].getAttribute("aria-label")).not.toBe(cards[1].getAttribute("aria-label"));

    await wait(900);

    // ...then flip back down since they didn't match.
    expect(cards[0].getAttribute("aria-label")).toBe("Face-down card");
    expect(cards[1].getAttribute("aria-label")).toBe("Face-down card");
    expect(screen.getByText(/matches: 0 \/ 2/i)).toBeInTheDocument();
  }, 10000);

  it("counts every pair of flips as one attempt, win or lose", async () => {
    const user = userEvent.setup();
    render(<MemoryPlayer config={config} onFinish={vi.fn()} />);

    const cards = screen.getAllByRole("button");
    await user.click(cards[0]);
    await user.click(cards[1]);
    await wait(900);

    expect(screen.getByText(/attempts: 1/i)).toBeInTheDocument();
  }, 10000);
});
