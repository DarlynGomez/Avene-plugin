import { describe, expect, it } from "vitest";
import { ELEMENT_ROLES } from "../teachMeWhy/explanationTypes";
import { ROLE_LABELS, ROLE_MEANINGS, toExplanationRole } from "./roleLabels";
import { NAME_RULES } from "./roleRuleData";

describe("the labels", () => {
  it("are the seven, in this order", () => {
    expect([...ROLE_LABELS]).toEqual([
      "heading",
      "body",
      "caption",
      "label",
      "button text",
      "decorative",
      "unsure"
    ]);
  });
  it("each have a one line meaning", () => {
    for (const label of ROLE_LABELS) expect(ROLE_MEANINGS[label].length).toBeGreaterThan(10);
  });
  it("look up as the six roles, and unsure as unknown", () => {
    expect(toExplanationRole("unsure")).toBe("unknown");
    for (const label of ROLE_LABELS.filter((l) => l !== "unsure")) {
      expect(ELEMENT_ROLES).toContain(toExplanationRole(label));
    }
  });
  it("are the only roles a rule can give", () => {
    for (const rule of NAME_RULES) expect(ROLE_LABELS).toContain(rule.role);
  });
});
