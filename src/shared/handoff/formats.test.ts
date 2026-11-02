import { describe, expect, it } from "vitest";

import { ALL_FORMATS, rawText } from "./formats";
import { sampleInput } from "./draftFixtures";

const input = sampleInput();
const reviewer = { name: "Sam Lee", date: "2026-10-28T13:00:00.000Z" };

describe("formats", () => {
  it("offers every kind of document to every reader", () => {
    expect(ALL_FORMATS).toEqual(["spec", "ticket", "brief"]);
  });

  it("builds the spec with the reviewer in the header, or a placeholder before there is one", () => {
    expect(rawText("spec", input, "developer", {}, reviewer)).toContain(
      "Reviewed by Sam Lee, 2026-10-28"
    );
    expect(rawText("spec", input, "developer", {}, null)).not.toContain("Reviewed by");
  });

  it("builds tickets for developers with the acceptance criteria", () => {
    const text = rawText("ticket", input, "developer", {}, reviewer);
    expect(text).toContain("Title: [A11y] Payment: text contrast");
    expect(text).toContain("Acceptance criteria");
    expect(text.endsWith("Reviewed by Sam Lee, 2026-10-28")).toBe(true);
  });

  it("builds the three-line brief without color codes", () => {
    const text = rawText("brief", input, "pm", {}, reviewer);
    expect(text.split("\n")).toHaveLength(4);
    expect(text).not.toMatch(/#[0-9A-F]{6}/);
    expect(text.endsWith("Reviewed by Sam Lee, 2026-10-28")).toBe(true);
  });
});
