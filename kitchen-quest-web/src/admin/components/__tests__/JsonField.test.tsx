import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JsonField } from "../JsonField";

/**
 * Regression tests for a real bug: JsonField used to initialize its
 * internal textarea text once from `value` and never re-sync, so an
 * async-loaded record's real value never displaced whatever placeholder
 * was rendered first. Found while building the Avatar Cosmetics editor,
 * but it affected every existing editor using this field (achievements,
 * games, regions, nutrition lessons) the same way.
 */
describe("JsonField", () => {
  it("displays the initial value on first render", () => {
    render(<JsonField label="Test" value={{ type: "always" }} onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue(JSON.stringify({ type: "always" }, null, 2));
  });

  it("re-syncs the displayed text when the value prop changes externally (e.g. async data arriving after mount)", () => {
    const { rerender } = render(<JsonField label="Test" value={{ type: "always" }} onChange={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue(JSON.stringify({ type: "always" }, null, 2));

    rerender(<JsonField label="Test" value={{ type: "levelAtLeast", value: 5 }} onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue(JSON.stringify({ type: "levelAtLeast", value: 5 }, null, 2));
  });

  it("does not fight the user's own typing (an onChange-driven value update doesn't stomp the textarea mid-edit)", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    function Wrapper() {
      const [value, setValue] = useState<unknown>({ type: "always" });
      return (
        <JsonField
          label="Test"
          value={value}
          onChange={(v) => {
            handleChange(v);
            setValue(v);
          }}
        />
      );
    }

    render(<Wrapper />);
    const textarea = screen.getByRole("textbox");

    await user.clear(textarea);
    await user.type(textarea, '{{"type": "always", "extra": true}');

    expect(handleChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('{"type": "always", "extra": true}');
  });

  it("shows a parse error for invalid JSON without crashing, and clears it once valid again", async () => {
    const user = userEvent.setup();
    render(<JsonField label="Test" value={{ type: "always" }} onChange={vi.fn()} />);
    const textarea = screen.getByRole("textbox");

    await user.clear(textarea);
    await user.type(textarea, "{{not valid json");

    expect(screen.getByRole("alert")).toHaveTextContent(/not valid json yet/i);

    await user.clear(textarea);
    await user.type(textarea, '{{"type": "always"}');

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
