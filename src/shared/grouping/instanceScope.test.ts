import { describe, expect, it } from "vitest";

import { deriveRoots } from "./deriveRoots";
import type { GroupableFinding } from "./groupingTypes";
import { narrowRoot, pruneSelections, selectionWithin } from "./instanceScope";

function finding(issueId: string, screenId: string, state: GroupableFinding["state"] = "open") {
  return {
    issueId,
    nodeId: issueId,
    nodeName: issueId,
    screenId,
    screenName: screenId,
    state,
    severity: "high",
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    backgroundBinding: null,
    requiredRatio: 4.5,
    measuredRatio: 2.17,
    order: 0
  } as unknown as GroupableFinding;
}

const [ROOT] = deriveRoots([finding("a1", "A"), finding("b1", "B"), finding("b2", "B")]);

describe("selectionWithin", () => {
  it("keeps only ticks the root still holds", () => {
    expect([...selectionWithin(new Set(["b1", "gone"]), ROOT)]).toEqual(["b1"]);
  });

  it("drops a tick on an instance that is already resolved", () => {
    const [mixed] = deriveRoots([finding("a1", "A"), finding("b1", "B", "resolved")]);
    expect(selectionWithin(new Set(["a1", "b1"]), mixed).size).toBe(1);
  });
});

describe("narrowRoot", () => {
  it("limits the root to one frame and picks its representative there", () => {
    const narrowed = narrowRoot(ROOT, new Set(["b1", "b2"]));
    expect(narrowed?.instances.map((i) => i.issueId)).toEqual(["b1", "b2"]);
    expect(narrowed?.representativeIssueId).toMatch(/^b/);
    expect(narrowed?.signature).toBe(ROOT.signature);
  });

  it("returns the same root when the card held all of it, and null when none remain", () => {
    expect(narrowRoot(ROOT, new Set(["a1", "b1", "b2"]))).toBe(ROOT);
    expect(narrowRoot(ROOT, new Set(["fixed"]))).toBeNull();
  });
});

describe("pruneSelections", () => {
  it("hands back the same map when nothing is stale, so no extra render follows", () => {
    const selected = { [ROOT.signature]: new Set(["b1"]) };
    expect(pruneSelections(selected, [ROOT])).toBe(selected);
  });

  it("drops a fixed tick, and a root that no longer exists", () => {
    const selected = { [ROOT.signature]: new Set(["b1", "fixed"]), old: new Set(["x"]) };
    const pruned = pruneSelections(selected, [ROOT]);
    expect(Object.keys(pruned)).toEqual([ROOT.signature]);
    expect([...pruned[ROOT.signature]]).toEqual(["b1"]);
  });
});
