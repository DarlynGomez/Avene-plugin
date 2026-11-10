import { describe, expect, it } from "vitest";

import { NOT_REVIEWED_LINE } from "./fixedLines";
import { rawText } from "./formats";
import { sampleInput } from "./draftFixtures";
import type { HandoffInput } from "./types";

const reviewer = { name: "Sam Lee", date: "2026-10-28T13:00:00.000Z" };
const withAi = (source?: "ai" | "ai_edited"): HandoffInput => ({
  ...sampleInput(),
  notes: [
    {
      nodeId: "9:1",
      nodeName: "Hero",
      note: {
        category: "alt",
        text: "A sunny cafe table",
        updatedAt: "2026-11-05T10:00:00.000Z",
        ...(source ? { source } : {})
      }
    }
  ]
});

describe("alt text a model drafted, in the copied document", () => {
  it("names the reviewer on the line and in the header when the reviewer name has been entered", () => {
    const text = rawText("spec", withAi("ai"), "developer", {}, reviewer);
    expect(text).toContain(
      'Decision: Alt text for "Hero": A sunny cafe table (AI-drafted, reviewed by Sam Lee)'
    );
    expect(text).toContain("Includes AI-drafted alt text: 1 note");
    expect(text).toContain("Reviewed by Sam Lee, 2026-10-28");
  });

  it("says confirmed by the designer in the quick copy, which keeps its own footer", () => {
    const text = rawText("spec", withAi("ai_edited"), "developer", {}, null, true);
    expect(text).toContain(
      'Alt text for "Hero": A sunny cafe table (AI-drafted, confirmed by the designer)'
    );
    expect(text.endsWith(NOT_REVIEWED_LINE)).toBe(true);
    expect(text).not.toContain("AI-drafted, reviewed by");
  });

  it("prints a designer's own note unchanged, in both", () => {
    for (const text of [
      rawText("spec", withAi(), "developer", {}, reviewer),
      rawText("spec", withAi(), "developer", {}, null, true)
    ]) {
      expect(text).toContain('Decision: Alt text for "Hero": A sunny cafe table');
      expect(text).not.toContain("AI-drafted");
    }
  });

  it("adds no line without a label: every body line still starts with one", () => {
    const text = rawText("spec", withAi("ai"), "developer", {}, reviewer);
    const body = text.split("\n").slice(text.split("\n").indexOf("") + 1);
    const lines = body.filter((line) => line !== "" && !line.startsWith("## "));
    for (const line of lines)
      expect(/^(Detected|Decision|Needs check):/.test(line), line).toBe(true);
  });
});
