import { describe, expect, it } from "vitest";

import type { GroupableFinding } from "./groupingTypes";
import { deriveRoots } from "./deriveRoots";

function finding(overrides: Partial<GroupableFinding> = {}): GroupableFinding {
  return {
    issueId: "contrast:1:1",
    nodeId: "1:1",
    nodeName: "Item description subtext",
    screenId: "screen-1",
    screenName: "Product Detail Screen",
    state: "open",
    severity: "high",
    measuredRatio: 2.17,
    requiredRatio: 4.5,
    foregroundHex: "#9CB5B1",
    backgroundHex: "#FFFFFF",
    foregroundBinding: "sage/muted",
    backgroundBinding: null,
    documentOrder: 0,
    ...overrides
  };
}

describe("deriveRoots", () => {
  it("groups instances that share a signature into one root", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", documentOrder: 0 }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", documentOrder: 1 })
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].instances).toHaveLength(2);
  });

  it("keeps equal colors with different required ratios as separate roots", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", requiredRatio: 4.5 }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", requiredRatio: 3 })
    ]);
    expect(roots).toHaveLength(2);
  });

  it("keeps the same foreground on different backgrounds as separate roots", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", backgroundHex: "#FFFFFF" }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", backgroundHex: "#F7FAF9" })
    ]);
    expect(roots).toHaveLength(2);
  });

  it("merges instances with the same colors bound to different background variables", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", backgroundBinding: "surface/card" }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", backgroundBinding: "surface/panel" })
    ]);
    expect(roots).toHaveLength(1);
    expect([...roots[0].backgroundBindings].sort()).toEqual(["surface/card", "surface/panel"]);
  });

  it("carries a root's displayed state from its instances", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", state: "deferred" }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", state: "open" })
    ]);
    expect(roots[0].displayState).toBe("open");
    expect(roots[0].stateBreakdown).toEqual({ open: 1, deferred: 1 });
  });

  it("picks the first instance in document order as representative when the designer selected none of them", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:2", nodeId: "1:2", documentOrder: 5 }),
      finding({ issueId: "contrast:1:1", nodeId: "1:1", documentOrder: 2 })
    ]);
    expect(roots[0].representativeIssueId).toBe("contrast:1:1");
  });

  it("picks the instance the designer most recently selected themselves over document order", () => {
    const roots = deriveRoots(
      [
        finding({ issueId: "contrast:1:1", nodeId: "1:1", documentOrder: 0 }),
        finding({ issueId: "contrast:1:2", nodeId: "1:2", documentOrder: 1 })
      ],
      ["1:2"]
    );
    expect(roots[0].representativeIssueId).toBe("contrast:1:2");
  });

  it("ignores selections that are not among the root's own instances", () => {
    const roots = deriveRoots(
      [
        finding({ issueId: "contrast:1:1", nodeId: "1:1", documentOrder: 0 }),
        finding({ issueId: "contrast:1:2", nodeId: "1:2", documentOrder: 1 })
      ],
      ["9:9"]
    );
    expect(roots[0].representativeIssueId).toBe("contrast:1:1");
  });

  it("records an unbound foreground as its own root, keyed by hex", () => {
    const roots = deriveRoots([finding({ foregroundBinding: null, foregroundHex: "#888888" })]);
    expect(roots[0].foregroundBinding).toBeNull();
    expect(roots[0].signature).toContain("unbound");
  });

  it("never picks an ignored instance as representative while the root is in To review, even first in document order", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", state: "ignored", documentOrder: 0 }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", state: "open", documentOrder: 1 })
    ]);
    expect(roots[0].displayState).toBe("open");
    expect(roots[0].representativeIssueId).toBe("contrast:1:2");
  });

  it("picks among ignored and resolved instances once a root has moved to Decisions", () => {
    const roots = deriveRoots([
      finding({ issueId: "contrast:1:1", nodeId: "1:1", state: "resolved", documentOrder: 0 }),
      finding({ issueId: "contrast:1:2", nodeId: "1:2", state: "ignored", documentOrder: 1 })
    ]);
    expect(roots[0].displayState).toBe("decided");
    expect(roots[0].representativeIssueId).toBe("contrast:1:1");
  });
});
