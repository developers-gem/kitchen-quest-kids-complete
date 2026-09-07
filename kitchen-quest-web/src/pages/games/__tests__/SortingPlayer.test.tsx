import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortingPlayer, type SortingConfig } from "../SortingPlayer";

const config: SortingConfig = {
  bins: [
    { id: "bin-fruit", label: "Fruits" },
    { id: "bin-veg", label: "Vegetables" },
  ],
  items: [
    { id: "item-1", label: "Apple" },
    { id: "item-2", label: "Carrot" },
  ],
};

describe("SortingPlayer", () => {
  it("renders every item unsorted and every bin", () => {
    render(<SortingPlayer config={config} onFinish={vi.fn()} />);
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Carrot")).toBeInTheDocument();
    expect(screen.getByText("Fruits")).toBeInTheDocument();
    expect(screen.getByText("Vegetables")).toBeInTheDocument();
  });

  it("disables Finish until every item is sorted", async () => {
    const user = userEvent.setup();
    render(<SortingPlayer config={config} onFinish={vi.fn()} />);

    expect(screen.getByRole("button", { name: /sort all 2 to finish/i })).toBeDisabled();

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByLabelText("Place in Fruits"));

    expect(screen.getByRole("button", { name: /sort all 2 to finish/i })).toBeDisabled();
  });

  it("enables Finish once all items are sorted, and submits the placements made", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<SortingPlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByLabelText("Place in Fruits"));
    await user.click(screen.getByText("Carrot"));
    await user.click(screen.getByLabelText("Place in Vegetables"));

    const finishButton = screen.getByRole("button", { name: /^finish$/i });
    expect(finishButton).toBeEnabled();

    await user.click(finishButton);

    expect(onFinish).toHaveBeenCalledWith({
      placements: expect.arrayContaining([
        { itemId: "item-1", binId: "bin-fruit" },
        { itemId: "item-2", binId: "bin-veg" },
      ]),
    });
  });

  it("moves a sorted item out of the 'to sort' pile and into its bin", async () => {
    const user = userEvent.setup();
    render(<SortingPlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByLabelText("Place in Fruits"));

    // "Apple" now only exists as the sorted chip inside the Fruits bin,
    // not in the "to sort" pile -- getByText would throw on ambiguity if
    // it still appeared in both places.
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /unsorted cards/i })?.textContent).not.toContain("Apple");
  });

  it("tapping a sorted item picks it back up, allowing it to be re-sorted", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<SortingPlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Apple"));
    await user.click(screen.getByLabelText("Place in Fruits"));

    // Pick "Apple" back up from the Fruits bin (its accessible name
    // includes "sorted into Fruits -- tap to pick back up").
    await user.click(screen.getByRole("button", { name: /apple.*sorted into fruits/i }));

    // Re-sort it into the (deliberately wrong, for this test) Vegetables
    // bin -- proving it was genuinely picked up, not stuck.
    await user.click(screen.getByLabelText("Place in Vegetables"));
    await user.click(screen.getByText("Carrot"));
    await user.click(screen.getByLabelText("Place in Fruits"));

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(onFinish).toHaveBeenCalledWith({
      placements: expect.arrayContaining([
        { itemId: "item-1", binId: "bin-veg" },
        { itemId: "item-2", binId: "bin-fruit" },
      ]),
    });
  });

  it("a bin tap does nothing when no item is currently selected", async () => {
    const user = userEvent.setup();
    render(<SortingPlayer config={config} onFinish={vi.fn()} />);

    // No selection made -- tapping a bin should be inert.
    const fruitsBin = screen.getByLabelText("Place in Fruits");
    await user.click(fruitsBin);

    expect(screen.getByRole("button", { name: /sort all 2 to finish/i })).toBeDisabled();
  });
});
