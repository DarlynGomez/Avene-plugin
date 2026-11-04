import { describe, expect, it } from "vitest";

import type { GroupableFinding, Root } from "../grouping/groupingTypes";
import type { IssueSummary } from "../issues/issueTypes";
import { focusItemsOf } from "./focusItems";

function instance(id: string, over: Partial<GroupableFinding> = {}): GroupableFinding {
  return {
    issueId: `contrast:${id}`,
    nodeId: id,
    nodeName: `Layer ${id}`,
    screenId: "s1",
    screenName: "Payment",
    state: "deferred",
    severity: "high",
    measuredRatio: 2.17,
    requiredRatio: 4.5,
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: "sage/muted",
    backgroundBinding: null,
    documentOrder: 0,
    ...over
  };
}

function root(over: Partial<Root> = {}): Root {
  const first = instance("1:1");
  return {
    signature: "#9CB5B1|#FFFFFF|sage/muted|4.5",
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: "sage/muted",
    requiredRatio: 4.5,
    instances: [first, instance("1:2")],
    representativeIssueId: first.issueId,
    backgroundBindings: [],
    displayState: "deferred",
    stateBreakdown: { deferred: 2 },
    ...over
  };
}

function issue(over: Partial<IssueSummary> = {}): IssueSummary {
  return {
    id: "contrast:1:1",
    ruleId: "contrast",
    nodeId: "1:1",
    nodeName: "Layer 1:1",
    state: "deferred",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "t",
    evidence: {
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "sage/muted",
      backgroundSource: { kind: "node", nodeId: "9:9", nodeName: "Main Card" }
    },
    ...over
  };
}

const lookup = (...issues: IssueSummary[]) => new Map(issues.map((i) => [i.id, i]));

describe("focusItemsOf", () => {
  it("describes a deferred root with its evidence, background layer and count", () => {
    const [found] = focusItemsOf([root()], lookup(issue()), {
      "#9CB5B1|#FFFFFF|sage/muted|4.5": 3
    });
    expect(found).toEqual({
      signature: "#9CB5B1|#FFFFFF|sage/muted|4.5",
      name: "sage/muted on #FFFFFF",
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      binding: "sage/muted",
      ancestor: "Main Card",
      layers: 2,
      deferCount: 3,
      nodeId: "1:1"
    });
  });

  it("names the background by its binding when it has one, and the page when there is no layer", () => {
    const bound = root({ instances: [instance("1:1", { backgroundBinding: "surface/card" })] });
    const page = issue({
      evidence: { ...(issue().evidence as object), backgroundSource: { kind: "page" } }
    });
    const [found] = focusItemsOf([bound], lookup(page), { [bound.signature]: 1 });
    expect(found.name).toBe("sage/muted on surface/card");
    expect(found.ancestor).toBe("Page background");
  });

  it("leaves out roots that are not deferred, have no count, or have no readable evidence", () => {
    const counts = { "#9CB5B1|#FFFFFF|sage/muted|4.5": 3 };
    expect(focusItemsOf([root({ displayState: "open" })], lookup(issue()), counts)).toEqual([]);
    expect(focusItemsOf([root()], lookup(issue()), {})).toEqual([]);
    expect(focusItemsOf([root()], lookup(), counts)).toEqual([]);
    expect(focusItemsOf([root()], lookup(issue({ evidence: { nope: 1 } })), counts)).toEqual([]);
  });

  it("uses the foreground color when the text is not bound", () => {
    const unbound = root({ foregroundBinding: null });
    const [found] = focusItemsOf([unbound], lookup(issue()), { [unbound.signature]: 2 });
    expect(found.name).toBe("#9CB5B1 on #FFFFFF");
    expect(found.binding).toBeNull();
  });
});
