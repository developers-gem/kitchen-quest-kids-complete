import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DragAndDropPlayer, type DragAndDropConfig } from "../DragAndDropPlayer";

const config: DragAndDropConfig = {
  slots: [
    { id: "slot-2", order: 2, label: "Second" },
    { id: "slot-1", order: 1, label: "First" },
  ],
  draggableItems: [
    { id: "item-1", label: "Flour" },
    { id: "item-2", label: "Sugar" },
  ],
};

describe("DragAndDropPlayer", () => {
  it("renders slots in order regardless of the array's own order", () => {
    render(<DragAndDropPlayer config={config} onFinish={vi.fn()} />);
    const labels = screen.getAllByText(/^(First|Second)$/).map((el) => el.textContent);
    expect(labels).toEqual(["First", "Second"]);
  });

  it("disables Finish until every item is placed", async () => {
    const user = userEvent.setup();
    render(<DragAndDropPlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByText("Flour"));
    await user.click(screen.getByLabelText("Place in First"));

    expect(screen.getByRole("button", { name: /place all 2 to finish/i })).toBeDisabled();
  });

  it("enables Finish once all items are placed and submits the correct slot/item pairs", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<DragAndDropPlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Flour"));
    await user.click(screen.getByLabelText("Place in First"));
    await user.click(screen.getByText("Sugar"));
    await user.click(screen.getByLabelText("Place in Second"));

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(onFinish).toHaveBeenCalledWith({
      placements: expect.arrayContaining([
        { slotId: "slot-1", itemId: "item-1" },
        { slotId: "slot-2", itemId: "item-2" },
      ]),
    });
  });

  it("picking a placed item back up frees its slot for something else", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<DragAndDropPlayer config={config} onFinish={onFinish} />);

    await user.click(screen.getByText("Flour"));
    await user.click(screen.getByLabelText("Place in First"));

    await user.click(screen.getByRole("button", { name: /flour.*placed in first/i }));

    await user.click(screen.getByText("Sugar"));
    await user.click(screen.getByLabelText("Place in First"));
    await user.click(screen.getByText("Flour"));
    await user.click(screen.getByLabelText("Place in Second"));

    await user.click(screen.getByRole("button", { name: /^finish$/i }));

    expect(onFinish).toHaveBeenCalledWith({
      placements: expect.arrayContaining([
        { slotId: "slot-1", itemId: "item-2" },
        { slotId: "slot-2", itemId: "item-1" },
      ]),
    });
  });

  it("a slot tap does nothing when no item is selected", async () => {
    const user = userEvent.setup();
    render(<DragAndDropPlayer config={config} onFinish={vi.fn()} />);

    await user.click(screen.getByLabelText("Place in First"));

    expect(screen.getByRole("button", { name: /place all 2 to finish/i })).toBeDisabled();
  });
});
