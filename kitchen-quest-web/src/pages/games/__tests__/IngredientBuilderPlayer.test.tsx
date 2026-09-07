import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngredientBuilderPlayer, type IngredientBuilderConfig } from "../IngredientBuilderPlayer";

const config: IngredientBuilderConfig = {
  targetItems: [
    { id: "target-1", label: "Banana" },
    { id: "target-2", label: "Strawberry" },
  ],
  distractorItems: [{ id: "distractor-1", label: "Candy Bar" }],
};

describe("IngredientBuilderPlayer", () => {
  it("renders targets and distractors together with no visible distinguishing flag", () => {
    render(<IngredientBuilderPlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByText("Banana")).toBeInTheDocument();
    expect(screen.getByText("Strawberry")).toBeInTheDocument();
    expect(screen.getByText("Candy Bar")).toBeInTheDocument();
  });

  it("disables Finish until at least one item is selected", () => {
    render(<IngredientBuilderPlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^finish$/i })).toBeDisabled();
  });

  it("toggles selection on tap and submits exactly the selected ids, including a wrongly-picked distractor", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<IngredientBuilderPlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Banana"));
    await user.click(screen.getByText("Candy Bar"));

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    const submitted = onFinish.mock.calls[0][0].selectedItemIds;
    expect(submitted).toContain("target-1");
    expect(submitted).toContain("distractor-1");
    expect(submitted).not.toContain("target-2");
  });

  it("re-tapping a selected item deselects it", async () => {
    const user = userEvent.setup();
    render(<IngredientBuilderPlayer config={config} onFinish={vi.fn()} />);

    const banana = screen.getByRole("button", { name: /banana/i });
    await user.click(banana);
    expect(banana).toHaveAttribute("aria-pressed", "true");

    await user.click(banana);
    expect(banana).toHaveAttribute("aria-pressed", "false");
  });
});
