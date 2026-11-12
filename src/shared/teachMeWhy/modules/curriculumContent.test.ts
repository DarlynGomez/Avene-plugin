import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LEARNING_MODULES } from "./modules";
import type { QuizFile } from "./curriculum/parseQuizzes";
import { STUDY_LIBRARY_MODULES } from "./studyLibrary";

const DIR = "src/shared/teachMeWhy/modules";
const read = (path: string) => JSON.parse(readFileSync(`${DIR}/${path}`, "utf8")) as unknown;
const QUIZZES = LEARNING_MODULES.map((module) => read(`quizzes/${module.id}.json`) as QuizFile);
const QUESTIONS = QUIZZES.flatMap((quiz) => quiz.questions);
function lesson(id: string) {
  const found = LEARNING_MODULES.find((module) => module.id === id);
  if (!found) throw new Error(`${id} is not a lesson`);
  return found;
}
function question(id: string) {
  const found = QUESTIONS.find((candidate) => candidate.questionId === id);
  if (!found) throw new Error(`${id} is not a question`);
  return found;
}
const lessonText = (id: string) => {
  const m = lesson(id);
  return [
    m.title,
    m.context,
    m.whyItMatters,
    ...m.learningObjectives,
    ...m.lessonParagraphs,
    ...m.keyTakeaways
  ].join("\n");
};

describe("the quizzes", () => {
  it("hold 36 questions, three for each of the twelve lessons", () => {
    expect(QUESTIONS).toHaveLength(36);
    for (const quiz of QUIZZES) expect(quiz.questions, quiz.moduleId).toHaveLength(3);
  });
  it("give every question unique option ids and a correct option that exists", () => {
    for (const question of QUESTIONS) {
      const ids = question.options.map((option) => option.id);
      expect(new Set(ids).size, question.questionId).toBe(ids.length);
      expect(ids, question.questionId).toContain(question.correctOptionId);
    }
  });
  it("name their own lesson and use the M01_Q1 form, with no id used twice", () => {
    for (const quiz of QUIZZES) {
      for (const question of quiz.questions) {
        expect(question.moduleId, question.questionId).toBe(quiz.moduleId);
        expect(question.questionId).toMatch(new RegExp(`^${quiz.moduleId}_Q[1-3]$`));
      }
    }
    expect(new Set(QUESTIONS.map((q) => q.questionId)).size).toBe(36);
  });
});

describe("the time budgets", () => {
  it("add up to each lesson's total, and the lessons add up to 41.5 minutes", () => {
    for (const module of LEARNING_MODULES) {
      const { reading, video, quiz } = module.timeBudgetMinutes;
      expect(reading + video + quiz, module.id).toBe(module.estimatedMinutes);
    }
    expect(LEARNING_MODULES.reduce((sum, module) => sum + module.estimatedMinutes, 0)).toBe(41.5);
  });
  it("are listed in the manifest with its reported total and no review flags", () => {
    const index = read("index.json") as Record<string, unknown> & { modules: { id: string }[] };
    expect(index.reportedTotalMinutes).toBe(41.5);
    expect(index.reviewFlags).toBeUndefined();
    expect(index.modules.map((entry) => entry.id)).toEqual(LEARNING_MODULES.map((m) => m.id));
  });
});

describe("the words", () => {
  const everyText = () => [
    ...LEARNING_MODULES.map((m) => lessonText(m.id)),
    ...QUESTIONS.flatMap((q) => [
      q.prompt,
      q.explanation,
      q.hint,
      q.testedLearningPoint,
      ...q.options.map((o) => o.text)
    ])
  ];
  it("never say research document, use a dash or a curly quote, or spell in UK English", () => {
    for (const text of everyText()) {
      expect(text).not.toMatch(/research document/i);
      expect(text).not.toMatch(/[–—‘’“”]/);
      expect(text).not.toMatch(/colour|grey|behaviour|favour/i);
    }
  });
  it("get the large text rule right in M04", () => {
    expect(lessonText("M04")).toContain("18.66");
    expect(lessonText("M04")).toContain("SemiBold does not count");
    expect(lessonText("M04")).not.toContain("18.5");
    const q3 = question("M04_Q3");
    expect(q3.prompt).toBe("In Avene, at what pixel size does Bold text count as large?");
    expect(q3.options.find((o) => o.id === q3.correctOptionId)?.text).toBe("18.66 pixels");
  });
  it("carry the 2026 figures", () => {
    expect(lessonText("M01")).toContain("83.9");
    expect(lessonText("M01")).toContain("79.1");
    expect(lessonText("M11")).toContain("53.1");
  });
});

describe("the study library list", () => {
  it("is M01 to M08 and every one is a lesson", () => {
    expect(STUDY_LIBRARY_MODULES).toEqual(["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08"]);
    for (const id of STUDY_LIBRARY_MODULES) expect(lesson(id)).toBeDefined();
  });
});
