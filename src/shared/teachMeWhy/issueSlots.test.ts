import { describe, expect, it } from "vitest";
import type { GroupableFinding, Root } from "../grouping/groupingTypes";
import { buildExplanationView } from "./explanationView";
import type { ExplanationTable, Depth, ElementRole, ExplanationKey } from "./explanationTypes";
import { fillSlots, formatFontSize, unfilledSlots } from "./fillSlots";
import { sameHueFix } from "./fixColour";
import { allowedFacts } from "./facts";
import { eligibleFacts } from "./factEligibility";
import { slotValues } from "./fillSlots";
import { validateExplanation } from "./validateExplanation";

const details = {
  foregroundHex: "#B6ADA5",
  backgroundHex: "#FFFFFF",
  fontSizePx: 14,
  fixHex: "#7F7267"
};

describe("fillSlots with issue details", () => {
  it("fills all six slots", () => {
    expect(
      fillSlots(
        "{foreground} on {background}, {measured} of {required}, {fontsize}, {fix}",
        2.21,
        4.5,
        details
      )
    ).toBe("#B6ADA5 on #FFFFFF, 2.21:1 of 4.5:1, 14px, #7F7267");
  });
  it("formats a fractional size with one decimal", () => {
    expect(formatFontSize(14)).toBe("14px");
    expect(formatFontSize(18.5)).toBe("18.5px");
  });
  it("reports a slot the text uses and no value exists for", () => {
    expect(unfilledSlots("Use {fix} at {fontsize}", 2, 4.5, { ...details, fixHex: null })).toEqual([
      "fix"
    ]);
    expect(unfilledSlots("Use {fix}", 2, 4.5, details)).toEqual([]);
    expect(unfilledSlots("no slots", 2, 4.5)).toEqual([]);
  });
});

describe("sameHueFix", () => {
  it("is the color the Keep your color option offers, and it reaches the ratio", () => {
    expect(sameHueFix("#B6ADA5", "#FFFFFF", 4.5)).toBe("#7F7267");
  });
  it("is null when nothing of the same hue can reach the ratio, or a color is unreadable", () => {
    expect(sameHueFix("#808080", "#7F7F7F", 21)).toBeNull();
    expect(sameHueFix("nope", "#FFFFFF", 4.5)).toBeNull();
  });
});

function finding(): GroupableFinding {
  return {
    issueId: "i1",
    nodeId: "n1",
    nodeName: "T",
    screenId: "s",
    screenName: "S",
    state: "open",
    severity: "high",
    measuredRatio: 2.21,
    requiredRatio: 4.5,
    foregroundHex: "#B6ADA5",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    backgroundBinding: null,
    documentOrder: 0
  };
}
const root: Root = {
  signature: "sig",
  foregroundHex: "#B6ADA5",
  backgroundHex: "#FFFFFF",
  foregroundBinding: null,
  requiredRatio: 4.5,
  instances: [finding()],
  representativeIssueId: "i1",
  backgroundBindings: [],
  displayState: "open",
  stateBreakdown: { open: 1 }
};
const table: ExplanationTable = {
  fallbacks: {
    "1": { text: "Fallback quick.", status: "fallback", reviewer: null, factIds: [] },
    "2": { text: "Fallback mid.", status: "fallback", reviewer: null, factIds: [] },
    "3": { text: "Fallback deep.", status: "fallback", reviewer: null, factIds: [] }
  },
  entries: {
    "unknown:high:normal:1": {
      text: "{foreground} on {background} at {fontsize}, fix {fix}.",
      status: "approved",
      reviewer: "DG",
      factIds: []
    }
  }
};

describe("buildExplanationView with the new slots", () => {
  it("fills the colors, the size and the fix", () => {
    const view = buildExplanationView(root, 1, table, () => undefined, 14);
    expect(view.text).toBe("#B6ADA5 on #FFFFFF at 14px, fix #7F7267.");
    expect(view.isAi).toBe(true);
  });
  it("shows the fixed template when the size is unknown", () => {
    const view = buildExplanationView(root, 1, table, () => undefined, null);
    expect(view.text).toBe("Fallback quick.");
    expect(view.isAi).toBe(false);
  });
  it("shows the fixed template when no fix color can exist", () => {
    const hard = {
      ...root,
      foregroundHex: "#808080",
      backgroundHex: "#7F7F7F",
      requiredRatio: 21,
      instances: [
        { ...finding(), foregroundHex: "#808080", backgroundHex: "#7F7F7F", requiredRatio: 21 }
      ]
    };
    expect(buildExplanationView(hard, 1, table, () => undefined, 14).text).toBe("Fallback quick.");
  });
});

describe("validator, slots and literal values", () => {
  const filler = (n: number) => Array.from({ length: n }, () => "word").join(" ");
  const key = (depth: Depth, role: ElementRole = "body"): ExplanationKey => ({
    role,
    severity: "high",
    size: "normal",
    depth
  });
  const check = (depth: Depth, text: string, used: string[] = []) =>
    validateExplanation({
      text,
      key: key(depth),
      usedFactIds: used,
      allowedFacts: eligibleFacts(key(depth)),
      slots: slotValues(2.2, 4.5)
    });
  const codes = (r: ReturnType<typeof check>) => (r.ok ? [] : r.reasons.map((x) => x.code));

  it("allows all six slots in depth 1 and five in depth 2 and 3", () => {
    expect(
      check(
        1,
        `{foreground} {background} {fontsize} {measured} {required} change the text to {fix} ${filler(20)}`
      ).ok
    ).toBe(true);
    expect(codes(check(2, `Change the text to {fix} ${filler(70)}`, ["F20"]))).toEqual([
      "slot-not-allowed"
    ]);
    expect(check(2, `{foreground} {background} {fontsize} ${filler(70)}`, ["F20"]).ok).toBe(true);
  });
  it("rejects a color or a size typed outside a slot", () => {
    expect(codes(check(1, `Use #AAAAAA here ${filler(30)}`))).toContain("literal-color");
    expect(codes(check(1, `Use #7f7267 here ${filler(30)}`))).toContain("literal-color");
    expect(codes(check(1, `At 14px it fails ${filler(30)}`))).toContain("literal-size");
    expect(codes(check(1, `At 14 px it fails ${filler(30)}`))).toContain("literal-size");
  });
  it("accepts a number in a used fact as written, and still refuses it as a size", () => {
    expect(check(3, `The scale runs to 21:1. ${filler(110)}`, ["F01"]).ok).toBe(true);
    expect(codes(check(3, `The scale runs to 24px. ${filler(110)}`, ["F01"]))).toContain(
      "literal-size"
    );
  });
  it("needs exactly one fact at depths 2 and 3 when the row offers any, and none at depth 1", () => {
    expect(codes(check(2, filler(70), []))).toContain("fact-count");
    expect(codes(check(2, filler(70), ["F16", "F20"]))).toContain("fact-count");
    expect(codes(check(1, filler(30), ["F16"]))).toContain("fact-not-allowed");
  });
  it("rejects the word glossy", () => {
    expect(codes(check(1, `A glossy screen {measured} {required} ${filler(30)}`))).toContain(
      "banned-term"
    );
  });
  it("keeps the matrix row as the older allowed list for unchanged callers", () => {
    expect(allowedFacts(key(2)).length).toBeGreaterThan(0);
  });
});
