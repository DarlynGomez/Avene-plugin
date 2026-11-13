import { describe, expect, it } from "vitest";

import { classifyTextSize } from "../../../../plugin/detection/rules/contrast/textSizeClass";
import { BOLD_MIN_FONT_WEIGHT } from "../../../../plugin/detection/rules/contrast/thresholds";
import { LEARNING_MODULES } from "../modules";
import type { LessonCallout } from "../moduleTypes";
import extrasFile from "./lessonExtras.json";
import { applyExtra, extraProblems } from "./lessonExtras";
import type { ParsedModule } from "./parseModules";
import { validateCallout } from "./validateCallout";

const lesson = (id: string) => {
  const found = LEARNING_MODULES.find((module) => module.id === id);
  if (!found) throw new Error(`${id} is not a lesson`);
  return found;
};
const parsed = (id: string): ParsedModule => {
  // The category is the one field the document does not hold, it is ignored here
  const module = lesson(id);
  return { ...module, forDevelopers: module.forDevelopers ?? "" };
};
const M04_CALLOUT = lesson("M04").callout as LessonCallout;

describe("the subtitle", () => {
  it("is plain text when given, and every lesson has one", () => {
    for (const module of LEARNING_MODULES) {
      expect(typeof module.subtitle, module.id).toBe("string");
      expect(module.subtitle?.trim(), module.id).not.toBe("");
    }
  });

  it("is optional, and refused when it is not text", () => {
    expect(extraProblems("M05", {}, parsed("M05"))).toEqual([]);
    expect(extraProblems("M05", { subtitle: 3 }, parsed("M05"))).toEqual([
      "M05: the subtitle is not plain text"
    ]);
  });
});

describe("the optional article", () => {
  const article = { title: "T", author: "A", url: "https://www.w3.org/x" };

  it("may have its minutes or null, and nothing else", () => {
    const one = parsed("M05");
    expect(
      extraProblems("M05", { optionalArticle: { ...article, minutesToRead: 4 } }, one)
    ).toEqual([]);
    expect(
      extraProblems("M05", { optionalArticle: { ...article, minutesToRead: null } }, one)
    ).toEqual([]);
    expect(
      extraProblems("M05", { optionalArticle: { ...article, minutesToRead: 0 } }, one)
    ).toEqual(["M05: the article minutes are not a positive number or null"]);
  });

  it("is on the lessons the team chose and on no other, with no reading time guessed", () => {
    const withArticle = LEARNING_MODULES.filter((m) => m.optionalArticle).map((m) => m.id);
    expect(withArticle).toEqual(["M01", "M02", "M03", "M04", "M06", "M09", "M11", "M12"]);
    for (const id of withArticle) expect(lesson(id).optionalArticle?.minutesToRead, id).toBeNull();
  });

  it("has an https address on a short list of known hosts", () => {
    const hosts = ["www.w3.org", "www.nngroup.com", "discovery.dundee.ac.uk"];
    for (const module of LEARNING_MODULES) {
      if (!module.optionalArticle) continue;
      const url = new URL(module.optionalArticle.url);
      expect(url.protocol, module.id).toBe("https:");
      expect(hosts, module.id).toContain(url.hostname);
    }
  });
});

describe("the videos", () => {
  it("leave M09 with no video, and the lessons add up to 40 minutes", () => {
    expect(lesson("M09").video).toBeNull();
    expect(lesson("M09").timeBudgetMinutes).toEqual({ reading: 2, video: 0, quiz: 1 });
    expect(lesson("M09").estimatedMinutes).toBe(3);
    expect(LEARNING_MODULES.reduce((sum, m) => sum + m.estimatedMinutes, 0)).toBe(40);
  });

  it("say a transcript exists for M01 and M12, and keep the other video fields", () => {
    expect(lesson("M01").video?.transcriptAvailable).toBe(true);
    expect(lesson("M12").video?.transcriptAvailable).toBe(true);
    expect(lesson("M06").video).toMatchObject({ startSeconds: 0, endSeconds: 80 });
    const changed = applyExtra(parsed("M01"), { video: { transcriptAvailable: false } });
    expect(changed.video?.videoId).toBe(lesson("M01").video?.videoId);
  });
});

describe("the callout", () => {
  it("is on M04 only, and its paragraph is one of the lesson's", () => {
    expect(LEARNING_MODULES.filter((m) => m.callout).map((m) => m.id)).toEqual(["M04"]);
    expect(validateCallout(M04_CALLOUT, lesson("M04").lessonParagraphs.length)).toEqual([]);
  });

  it("refuses a bad shape: no rows, too many rows, a bad size, a bad weight, a paragraph that is not there", () => {
    const count = lesson("M04").lessonParagraphs.length;
    const row = M04_CALLOUT.rows[0];
    const bad = (change: Partial<LessonCallout>) =>
      validateCallout({ ...M04_CALLOUT, ...change }, count);
    expect(bad({ rows: [] })).toContain("the callout needs 1 to 8 rows");
    expect(bad({ rows: Array.from({ length: 9 }, () => row) })).toContain(
      "the callout needs 1 to 8 rows"
    );
    expect(bad({ rows: [{ ...row, sample: { px: 0, weight: 400 } }] })).toContain(
      "callout row 1 has a size that is not a positive number"
    );
    expect(bad({ rows: [{ ...row, sample: { px: 14, weight: 950 } }] })).toContain(
      "callout row 1 has a weight outside 100 to 900"
    );
    expect(bad({ paragraphIndex: count })).toContain(
      "the callout paragraph is not one of the lesson paragraphs"
    );
  });

  it("never disagrees with the detection engine about which text is large", () => {
    for (const row of M04_CALLOUT.rows) {
      const large =
        classifyTextSize(row.sample.px, row.sample.weight >= BOLD_MIN_FONT_WEIGHT) === "large";
      const saysLarge = row.needs === "3:1" && row.note === "Counts as large";
      expect(large, row.size).toBe(saysLarge);
    }
  });
});

describe("the extras file", () => {
  it("names only lessons that exist", () => {
    const ids = LEARNING_MODULES.map((m) => m.id);
    for (const id of Object.keys(extrasFile)) expect(ids).toContain(id);
  });
});
