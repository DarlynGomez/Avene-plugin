import { describe, expect, it } from "vitest";

import type { GroupableFinding } from "./groupingTypes";
import { groupByScreen, groupBySeverity } from "./secondaryGrouping";

function finding(overrides: Partial<GroupableFinding> = {}): GroupableFinding {
  return {
    issueId: "contrast:1:1",
    nodeId: "1:1",
    nodeName: "Text",
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

describe("groupByScreen", () => {
  it("buckets findings by screen id", () => {
    const groups = groupByScreen([
      finding({ issueId: "a", screenId: "screen-checkout", screenName: "Checkout" }),
      finding({ issueId: "b", screenId: "screen-checkout", screenName: "Checkout" }),
      finding({ issueId: "c", screenId: "screen-1", screenName: "Product Detail Screen" })
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "screen-checkout")?.instances).toHaveLength(2);
    expect(groups.find((g) => g.key === "screen-1")?.instances).toHaveLength(1);
  });

  it("keeps two same-named screens separate, since names are not unique", () => {
    const groups = groupByScreen([
      finding({ issueId: "a", screenId: "screen-1", screenName: "Desktop" }),
      finding({ issueId: "b", screenId: "screen-2", screenName: "Desktop" })
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe("groupBySeverity", () => {
  it("buckets findings by severity band", () => {
    const groups = groupBySeverity([
      finding({ issueId: "a", severity: "high" }),
      finding({ issueId: "b", severity: "low" }),
      finding({ issueId: "c", severity: "high" })
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.key === "high")?.instances).toHaveLength(2);
    expect(groups.find((g) => g.key === "low")?.instances).toHaveLength(1);
  });

  it("puts high first, then medium, then low, whatever order the findings arrive in", () => {
    const groups = groupBySeverity([
      finding({ issueId: "a", severity: "low" }),
      finding({ issueId: "b", severity: "medium" }),
      finding({ issueId: "c", severity: "high" }),
      finding({ issueId: "d", severity: "low" })
    ]);
    expect(groups.map((g) => g.key)).toEqual(["high", "medium", "low"]);
  });

  it("leaves out a band that has nothing in it", () => {
    const groups = groupBySeverity([
      finding({ issueId: "a", severity: "low" }),
      finding({ issueId: "b", severity: "high" })
    ]);
    expect(groups.map((g) => g.key)).toEqual(["high", "low"]);
  });
});
