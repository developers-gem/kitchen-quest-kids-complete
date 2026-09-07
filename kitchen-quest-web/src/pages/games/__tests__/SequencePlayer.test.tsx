import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SequencePlayer, type SequenceConfig } from "../SequencePlayer";

const config: SequenceConfig = {
  steps: [
    { id: "step-1", label: "Wash the vegetables" },
    { id: "step-2", label: "Chop the vegetables" },
    { id: "step-3", label: "Cook the vegetables" },
  ],
};

describe("SequencePlayer", () => {
  it("renders every step and an empty 'your order' prompt initially", () => {
    render(<SequencePlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByText("Wash the vegetables")).toBeInTheDocument();
    expect(screen.getByText(/tap a step below to start/i)).toBeInTheDocument();
  });

  it("disables Finish until every step has been placed", async () => {
    const user = userEvent.setup();
    render(<SequencePlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByText("Wash the vegetables"));

    expect(screen.getByRole("button", { name: /place all 3 steps to finish/i })).toBeDisabled();
  });

  it("submits steps in the exact order they were tapped, regardless of original config order", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<SequencePlayer config={config} onFinish={onFinish} />);

    // Tap deliberately out of original config order.
    await user.click(screen.getByText("Chop the vegetables"));
    await user.click(screen.getByText("Wash the vegetables"));
    await user.click(screen.getByText("Cook the vegetables"));

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(onFinish).toHaveBeenCalledWith({ submittedOrder: ["step-2", "step-1", "step-3"] });
  });

  it("tapping a placed step removes it, letting it be re-picked in a different position", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<SequencePlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Wash the vegetables"));
    await user.click(screen.getByText("Chop the vegetables"));

    // Undo the first pick via its numbered entry in "your order".
    await user.click(screen.getByRole("button", { name: /step 1: wash the vegetables/i }));

    // Re-pick it after chop instead.
    await user.click(screen.getByText("Wash the vegetables"));
    await user.click(screen.getByText("Cook the vegetables"));

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(onFinish).toHaveBeenCalledWith({ submittedOrder: ["step-2", "step-1", "step-3"] });
  });
});
