import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildCurriculumFiles } from "./buildFiles";
import { parseArticle, parseVideo } from "./parseMedia";
import { parseCurriculum } from "./parseModules";
import { parseQuizzes } from "./parseQuizzes";

const SOURCE = "docs/study/lessons/CURRICULUM_LATEST.txt";
const DIR = "src/shared/teachMeWhy/modules";

const BLOCK = `Module M01: A Title
* Context: A context
* Why this matters: Because.
* What you will learn:
   * One.
   * Two.
   * Three.
* Time budget: Reading: 2 minutes. Video: 1.5 minutes. Quiz: 1 minute. Total: 4.5 minutes.
* Lesson text:
First paragraph.
Second paragraph.
Third paragraph.
Fourth paragraph.
   * Video: None included.
   * Optional article: None.
   * Key takeaways:
   * A.
   * B.
   * C.
   * Review flags: None.
   * For developers: Notes.
Delivery Options`;

describe("parseCurriculum", () => {
  it("reads a module block by its labels", () => {
    const { modules, problems } = parseCurriculum(BLOCK);
    expect(problems).toEqual([]);
    expect(modules[0]).toMatchObject({
      id: "M01",
      title: "A Title",
      estimatedMinutes: 4.5,
      timeBudgetMinutes: { reading: 2, video: 1.5, quiz: 1 },
      video: null,
      optionalArticle: null,
      reviewFlags: [],
      forDevelopers: "Notes."
    });
    expect(modules[0].lessonParagraphs).toHaveLength(4);
  });
  it("reports a count that is off and does not guess", () => {
    const { problems } = parseCurriculum(BLOCK.replace("Fourth paragraph.\n", ""));
    expect(problems).toContain("M01: lesson paragraph count is 3, expected 4");
  });
  it("reads each Review flags line as its own flag", () => {
    const { modules } = parseCurriculum(
      BLOCK.replace("* Review flags: None.", "* Review flags: First.\n   * Review flags: Second.")
    );
    expect(modules[0].reviewFlags).toEqual(["First.", "Second."]);
  });
  it("puts a flag in an array and a missing note nowhere", () => {
    const { modules } = parseCurriculum(
      BLOCK.replace("Review flags: None.", "Review flags: Check this.")
    );
    expect(modules[0].reviewFlags).toEqual(["Check this."]);
    expect(modules[0].internalNote).toBeUndefined();
  });
});

describe("parseVideo and parseArticle", () => {
  it("reads a video line", () => {
    const line =
      '"A clip" by Someone (S). URL: https://www.youtube.com/watch?v=abc_123-x. Timestamps: 0:05 to 1:12. Clip length: 1:07. Captions available: Yes. Transcript available: Unknown. Embedding allowed: Yes. License or terms: W3C License. Why chosen: Because.';
    expect(parseVideo(line)).toEqual({
      provider: "youtube",
      videoId: "abc_123-x",
      title: "A clip",
      publisher: "Someone (S)",
      startSeconds: 5,
      endSeconds: 72,
      durationSeconds: 67,
      captionsAvailable: true,
      transcriptAvailable: null,
      embeddingAllowed: true,
      license: "W3C License"
    });
    expect(parseVideo("None included.")).toBeNull();
    expect(typeof parseVideo("nonsense")).toBe("string");
  });
  it("reads an article line", () => {
    const line =
      '"A paper" by A. Writer. URL: https://example.org/p.pdf. Minutes to read: 5. Open access: Yes.';
    expect(parseArticle(line)).toEqual({
      title: "A paper",
      author: "A. Writer",
      url: "https://example.org/p.pdf",
      minutesToRead: 5
    });
  });
});

describe("parseQuizzes", () => {
  it("refuses a correct option that is not among the options", () => {
    const question = {
      moduleId: "M01",
      questionId: "M01_Q1",
      prompt: "p",
      options: [
        { id: "A", text: "a" },
        { id: "B", text: "b" }
      ],
      correctOptionId: "Z",
      explanation: "e",
      hint: "h",
      testedLearningPoint: "t"
    };
    const { problems } = parseQuizzes(
      `Appendix: Quizzes (JSON)\n[\n${JSON.stringify(question)}\n]\nWorks cited`
    );
    expect(problems[0]).toContain("the correct option is not among the options");
  });
});

describe("the generated files match the curriculum document", () => {
  if (!existsSync(SOURCE)) {
    console.warn(`curriculum: ${SOURCE} is not here, the check against the document is skipped`);
    it.skip("are what the script writes", () => undefined);
    return;
  }
  it("are what the script writes, so a hand edit fails", () => {
    const existing: Record<string, Record<string, unknown>> = {};
    for (let n = 1; n <= 12; n += 1) {
      const id = `M${String(n).padStart(2, "0")}`;
      existing[id] = JSON.parse(readFileSync(`${DIR}/${id}.json`, "utf8")) as Record<
        string,
        unknown
      >;
    }
    const { files, problems } = buildCurriculumFiles(readFileSync(SOURCE, "utf8"), existing);
    expect(problems).toEqual([]);
    expect(Object.keys(files)).toHaveLength(25);
    for (const [name, text] of Object.entries(files)) {
      expect(readFileSync(`${DIR}/${name}`, "utf8"), name).toBe(text);
    }
  });
});
