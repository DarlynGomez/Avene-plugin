import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { quizQuestions } from "../../../../shared/teachMeWhy/modules/quizCounts";
import { ModuleDetailScreen } from "../ModuleDetailScreen";
import { FULL_LESSON } from "../lesson/lessonFixture";

afterEach(cleanup);

const QUESTIONS = quizQuestions(FULL_LESSON.id);
const optionText = (index: number, id: string) =>
  QUESTIONS[index].options.find((o) => o.id === id)?.text as string;
const wrongId = (index: number) =>
  QUESTIONS[index].options.find((o) => o.id !== QUESTIONS[index].correctOptionId)?.id as string;

async function openQuiz() {
  const user = userEvent.setup();
  const onBack = vi.fn();
  const { container } = render(<ModuleDetailScreen module={FULL_LESSON} onBack={onBack} />);
  await user.click(screen.getByRole("button", { name: "Start" }));
  return { user, onBack, container };
}

async function answer(user: ReturnType<typeof userEvent.setup>, index: number, id: string) {
  await user.click(screen.getByRole("radio", { name: optionText(index, id) }));
  await user.click(screen.getByRole("button", { name: "Check answer" }));
}

describe("the quiz screen", () => {
  it("opens from Start with focus on its heading, and shows the first question as a named group of choices", async () => {
    await openQuiz();
    expect(screen.getByRole("heading", { level: 1, name: FULL_LESSON.title })).toHaveFocus();
    expect(screen.getByText("Check your understanding")).toBeInTheDocument();
    expect(screen.getByText(`Quiz · Question 1 of ${QUESTIONS.length}`)).toBeInTheDocument();
    const group = screen.getByRole("group", { name: QUESTIONS[0].prompt });
    expect(within(group).getAllByRole("radio")).toHaveLength(QUESTIONS[0].options.length);
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
  });

  it("says why after a check, marks the right answer in words, and locks the choices", async () => {
    const { user } = await openQuiz();
    await answer(user, 0, wrongId(0));
    expect(screen.getByRole("status")).toHaveTextContent(`Not quite.${QUESTIONS[0].explanation}`);
    expect(screen.getByText("Correct answer")).toBeInTheDocument();
    expect(screen.getByText("Your answer")).toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next question" })).toHaveFocus();
  });

  it("shows the hint only when asked, and never the tested learning point", async () => {
    const { user, container } = await openQuiz();
    expect(screen.queryByText(`Hint: ${QUESTIONS[0].hint}`)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show a hint" }));
    expect(screen.getByText(`Hint: ${QUESTIONS[0].hint}`)).toBeInTheDocument();
    const quiz = (await import("../../../../shared/teachMeWhy/modules/quizzes/M04.json")).default;
    for (const question of quiz.questions) {
      expect(container.textContent).not.toContain(question.testedLearningPoint);
    }
  });

  it("moves through every question to the score, with each right answer listed, and starts over", async () => {
    const { user } = await openQuiz();
    await answer(user, 0, QUESTIONS[0].correctOptionId);
    await user.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByRole("heading", { level: 2, name: QUESTIONS[1].prompt })).toHaveFocus();
    await answer(user, 1, wrongId(1));
    await user.click(screen.getByRole("button", { name: "Next question" }));
    await answer(user, 2, QUESTIONS[2].correctOptionId);
    await user.click(screen.getByRole("button", { name: "See results" }));
    const results = screen.getByRole("heading", {
      level: 2,
      name: "You answered 2 of 3 correctly."
    });
    expect(results).toHaveFocus();
    for (const [i, q] of QUESTIONS.entries()) {
      expect(screen.getByText(`Answer: ${optionText(i, q.correctOptionId)}`)).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { level: 2, name: QUESTIONS[0].prompt })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
  });

  it("goes back to the lesson from the back control, Escape and the results, and never to the topic list", async () => {
    const { user, onBack } = await openQuiz();
    await user.click(screen.getByRole("button", { name: "Back to lesson" }));
    expect(screen.getByRole("region", { name: "What you will learn" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("region", { name: "What you will learn" })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("loads nothing from the network and sends nothing", async () => {
    const post = vi.spyOn(window.parent, "postMessage");
    const { user, container } = await openQuiz();
    await answer(user, 0, QUESTIONS[0].correctOptionId);
    expect(container.querySelector("iframe, img, [src], a[href]")).toBeNull();
    expect(post).not.toHaveBeenCalled();
    post.mockRestore();
  });
});
