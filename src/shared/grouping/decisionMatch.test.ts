import { describe, expect, it } from "vitest";

import { buildRootSignature } from "../issues/rootSignature";
import type { GroupableFinding, Root, RootDecision } from "./groupingTypes";
import { matchDecision, matchRootDecision, type MatchableFinding } from "./decisionMatch";

const SAGE_ON_WHITE: MatchableFinding = {
  foregroundHex: "#9CB5B1",
  backgroundHex: "#FFFFFF",
  foregroundBinding: "sage/muted",
  requiredRatio: 4.5,
  severity: "high"
};

function decisionFor(
  finding: MatchableFinding,
  severityAtDecision: RootDecision["severityAtDecision"]
): RootDecision {
  return {
    signature: buildRootSignature(finding),
    reason: "Brand color required by guidelines; tracked for the next brand review",
    recordedAt: "2026-09-01T00:00:00.000Z",
    severityAtDecision
  };
}

describe("matchDecision", () => {
  it("offers nothing when no decision matches the signature", () => {
    const result = matchDecision(SAGE_ON_WHITE, {});
    expect(result).toEqual({ offered: false, decision: null, reason: "no-match" });
  });

  it("offers the decision when the new instance is at the same severity", () => {
    const decision = decisionFor(SAGE_ON_WHITE, "high");
    const result = matchDecision(SAGE_ON_WHITE, { [decision.signature]: decision });
    expect(result).toEqual({ offered: true, decision });
  });

  it("offers the decision when the new instance is at a better severity", () => {
    const decision = decisionFor(SAGE_ON_WHITE, "high");
    const result = matchDecision(
      { ...SAGE_ON_WHITE, severity: "low" },
      { [decision.signature]: decision }
    );
    expect(result).toEqual({ offered: true, decision });
  });

  it("suppresses the offer when the new instance is at a worse severity than the decision", () => {
    const decision = decisionFor(SAGE_ON_WHITE, "low");
    const result = matchDecision(
      { ...SAGE_ON_WHITE, severity: "high" },
      { [decision.signature]: decision }
    );
    expect(result).toEqual({ offered: false, decision, reason: "worse-severity" });
  });

  it("does not match a decision recorded for a different required ratio", () => {
    const decision = decisionFor({ ...SAGE_ON_WHITE, requiredRatio: 3 }, "high");
    const result = matchDecision(SAGE_ON_WHITE, { [decision.signature]: decision });
    expect(result).toEqual({ offered: false, decision: null, reason: "no-match" });
  });
});

function instanceOf(overrides: Partial<GroupableFinding> = {}): GroupableFinding {
  return {
    issueId: "contrast:1:1",
    nodeId: "1:1",
    nodeName: "Text",
    screenId: "screen-1",
    screenName: "Product Detail Screen",
    state: "open",
    measuredRatio: 2.17,
    backgroundBinding: null,
    ...SAGE_ON_WHITE,
    documentOrder: 0,
    ...overrides
  };
}

function rootOf(
  instances: readonly GroupableFinding[]
): Pick<
  Root,
  "foregroundHex" | "backgroundHex" | "foregroundBinding" | "requiredRatio" | "instances"
> {
  const first = instances[0];
  return {
    foregroundHex: first.foregroundHex,
    backgroundHex: first.backgroundHex,
    foregroundBinding: first.foregroundBinding,
    requiredRatio: first.requiredRatio,
    instances
  };
}

describe("matchRootDecision", () => {
  it("takes severity from any instance, since every instance in a root shares one by construction", () => {
    const decision = decisionFor(SAGE_ON_WHITE, "high");
    const root = rootOf([instanceOf({ issueId: "a" }), instanceOf({ issueId: "b" })]);

    const result = matchRootDecision(root, { [decision.signature]: decision });

    expect(result).toEqual({ offered: true, decision });
  });

  it("suppresses the offer when the root's severity has worsened since the decision", () => {
    const decision = decisionFor(SAGE_ON_WHITE, "low");
    const root = rootOf([instanceOf({ severity: "high" })]);

    const result = matchRootDecision(root, { [decision.signature]: decision });

    expect(result).toEqual({ offered: false, decision, reason: "worse-severity" });
  });

  it("offers nothing for a root with no matching decision", () => {
    const root = rootOf([instanceOf()]);
    expect(matchRootDecision(root, {})).toEqual({
      offered: false,
      decision: null,
      reason: "no-match"
    });
  });
});
