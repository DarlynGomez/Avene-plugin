import { describe, expect, it } from "vitest";
import type { GroupableFinding, Root } from "../grouping/groupingTypes";
import {
  buildExplanationKey,
  keyToString,
  selectRole,
  sizeClassFromRequired
} from "./explanationKey";

function instance(issueId: string, nodeId: string, severity: GroupableFinding["severity"]) {
  return {
    issueId,
    nodeId,
    nodeName: nodeId,
    screenId: "s",
    screenName: "S",
    state: "open",
    severity,
    measuredRatio: 2.17,
    requiredRatio: 4.5,
    foregroundHex: "#AAAAAA",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    backgroundBinding: null,
    documentOrder: 0
  } satisfies GroupableFinding;
}

function root(requiredRatio: number): Root {
  return {
    signature: "sig",
    foregroundHex: "#AAAAAA",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    requiredRatio,
    instances: [instance("i1", "n1", "low"), instance("i2", "n2", "high")],
    representativeIssueId: "i2",
    backgroundBindings: [],
    displayState: "open",
    stateBreakdown: { open: 2 }
  };
}

describe("selectRole", () => {
  it("prefers the confirmed role", () => {
    expect(selectRole({ confirmed: "heading", ruleDecided: "caption" })).toBe("heading");
  });
  it("uses the rule decided role when none is confirmed", () => {
    expect(selectRole({ confirmed: null, ruleDecided: "caption" })).toBe("caption");
  });
  it("is unknown when neither exists or nothing is known", () => {
    expect(selectRole({ confirmed: null, ruleDecided: null })).toBe("unknown");
    expect(selectRole(undefined)).toBe("unknown");
  });
});

describe("sizeClassFromRequired", () => {
  it("reads 3 as large and 4.5 as normal", () => {
    expect(sizeClassFromRequired(3)).toBe("large");
    expect(sizeClassFromRequired(4.5)).toBe("normal");
  });
});

describe("buildExplanationKey", () => {
  it("takes severity and role from the representative, not the other instances", () => {
    const roles = (nodeId: string) =>
      nodeId === "n2"
        ? { confirmed: null, ruleDecided: "label" as const }
        : { confirmed: "heading" as const, ruleDecided: null };
    expect(buildExplanationKey(root(4.5), 2, roles)).toEqual({
      role: "label",
      severity: "high",
      size: "normal",
      depth: 2
    });
  });
  it("is unknown with no role data and large when the bar is 3", () => {
    expect(buildExplanationKey(root(3), 1, () => undefined)).toEqual({
      role: "unknown",
      severity: "high",
      size: "large",
      depth: 1
    });
  });
  it("refuses a root whose representative is missing", () => {
    const broken = { ...root(4.5), representativeIssueId: "gone" };
    expect(() => buildExplanationKey(broken, 1, () => undefined)).toThrow();
  });
});

describe("keyToString", () => {
  it("is unique for each of the 126 keys", () => {
    const roles = [
      "heading",
      "body",
      "caption",
      "label",
      "button text",
      "decorative",
      "unknown"
    ] as const;
    const seen = new Set<string>();
    for (const role of roles)
      for (const severity of ["low", "medium", "high"] as const)
        for (const size of ["normal", "large"] as const)
          for (const depth of [1, 2, 3] as const)
            seen.add(keyToString({ role, severity, size, depth }));
    expect(seen.size).toBe(126);
  });
});
