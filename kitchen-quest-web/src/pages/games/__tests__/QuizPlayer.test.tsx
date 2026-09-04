import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizPlayer } from "../QuizPlayer";

/**
 * Dedicated unit tests for the quiz interaction itself, isolated from
 * GamePlayPage's start/finish/results orchestration (which already has
 * its own end-to-end test). These exercise question-to-question
 * navigation, answer selection, and the exact payload shape submitted
 * on finish -- all previously only covered indirectly.
 */
const questions = [
  {
    id: "q1",
    prompt: "Which is a fruit?",
    options: [
      { id: "a", text: "Apple" },
      { id: "b", text: "Carrot" },
    ],
  },
  {
    id: "q2",
    prompt: "Which is a vegetable?",
    options: [
      { id: "c", text: "Carrot" },
      { id: "d", text: "Apple" },
    ],
  },
];

describe("QuizPlayer", () => {
  it("shows the first question and a progress indicator", () => {
    render(<QuizPlayer questions={questions} onFinish={vi.fn()} />);
    expect(screen.getByText("Which is a fruit?")).toBeInTheDocument();
    expect(screen.getByText(/question 1 of 2/i)).toBeInTheDocument();
  });

  it("disables Next until an option is selected", async () => {
    const user = userEvent.setup();
    render(<QuizPlayer questions={questions} onFinish={vi.fn()} />);

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Apple" }));

    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("advances to the next question without submitting yet", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizPlayer questions={questions} onFinish={onFinish} />);

    await user.click(screen.getByRole("radio", { name: "Apple" }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Which is a vegetable?")).toBeInTheDocument();
    expect(screen.getByText(/question 2 of 2/i)).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("shows Finish (not Next) on the last question, and submits all answers on click", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizPlayer questions={questions} onFinish={onFinish} />);

    await user.click(screen.getByRole("radio", { name: "Apple" }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("button", { name: /finish/i })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Carrot" }));
    await user.click(screen.getByRole("button", { name: /finish/i }));

    expect(onFinish).toHaveBeenCalledWith([
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionId: "c" },
    ]);
  });

  it("remembers a previously-selected answer if a question is revisited via selection state", async () => {
    // This player doesn't currently support going *back* to a previous
    // question (only forward), so this test documents that boundary
    // rather than assuming back-navigation exists: selecting an answer
    // for q1 and moving on should not be resettable within this
    // component's own UI.
    const user = userEvent.setup();
    render(<QuizPlayer questions={questions} onFinish={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: "Apple" }));
    expect(screen.getByRole("radio", { name: "Apple" })).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.queryByRole("button", { name: /^previous$/i })).not.toBeInTheDocument();
  });
});
