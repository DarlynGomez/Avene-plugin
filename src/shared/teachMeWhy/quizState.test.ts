import { describe, expect, it } from "vitest";

import { LEARNING_MODULES } from "./modules/modules";
import { quizQuestions } from "./modules/quizCounts";
import { QUIZ_START, quizScore, quizStep, type QuizAction, type QuizState } from "./quizState";

const run = (actions: QuizAction[], from: QuizState = QUIZ_START) => actions.reduce(quizStep, from);

describe("the quiz steps", () => {
  it("checks nothing until an option is picked, then locks the choice", () => {
    expect(run([{ type: "check", correctOptionId: "B" }])).toEqual(QUIZ_START);
    const checked = run([
      { type: "choose", optionId: "A" },
      { type: "check", correctOptionId: "B" }
    ]);
    expect(checked).toMatchObject({ chosen: "A", checked: true, results: [false] });
    expect(quizStep(checked, { type: "choose", optionId: "B" })).toBe(checked);
    expect(quizStep(checked, { type: "check", correctOptionId: "A" })).toBe(checked);
  });

  it("moves on only after a check, and ends after the last question", () => {
    expect(run([{ type: "next", total: 3 }])).toEqual(QUIZ_START);
    const answer = (id: string): QuizAction[] => [
      { type: "choose", optionId: id },
      { type: "check", correctOptionId: "B" },
      { type: "next", total: 3 }
    ];
    const second = run(answer("B"));
    expect(second).toMatchObject({ index: 1, chosen: null, checked: false, results: [true] });
    const end = run([...answer("B"), ...answer("C"), ...answer("B")]);
    expect(end.done).toBe(true);
    expect(end.results).toEqual([true, false, true]);
    expect(quizScore(end)).toBe(2);
  });

  it("shows a hint only before the answer is checked, and a new question starts without it", () => {
    expect(run([{ type: "hint" }]).showHint).toBe(true);
    const checked = run([
      { type: "choose", optionId: "A" },
      { type: "check", correctOptionId: "A" }
    ]);
    expect(quizStep(checked, { type: "hint" }).showHint).toBe(false);
    const next = run([
      { type: "hint" },
      { type: "choose", optionId: "A" },
      { type: "check", correctOptionId: "A" },
      { type: "next", total: 3 }
    ]);
    expect(next.showHint).toBe(false);
  });

  it("starts over from the first question with no answers", () => {
    const end = run([
      { type: "choose", optionId: "A" },
      { type: "check", correctOptionId: "A" }
    ]);
    expect(quizStep(end, { type: "restart" })).toEqual(QUIZ_START);
  });
});

describe("the questions the quiz screen gets", () => {
  it("are three for every lesson, and never carry the tested learning point", () => {
    for (const module of LEARNING_MODULES) {
      const questions = quizQuestions(module.id);
      expect(questions, module.id).toHaveLength(3);
      for (const question of questions) {
        expect(Object.keys(question)).not.toContain("testedLearningPoint");
        expect(question.options.map((o) => o.id)).toContain(question.correctOptionId);
      }
    }
    expect(quizQuestions("M99")).toEqual([]);
  });
});
