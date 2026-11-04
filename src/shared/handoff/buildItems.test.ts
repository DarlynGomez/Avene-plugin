import { describe, expect, it } from "vitest";

import { buildItems } from "./buildItems";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";

describe("buildItems", () => {
  it("sorts findings by state: action, left as-is, deferred count, resolved out", () => {
    const { items, deferredLayers } = buildItems(
      input({
        findings: [
          finding(),
          ignoredFinding(),
          finding({ issueId: "d", state: "deferred", foregroundHex: "#111111" }),
          finding({ issueId: "r", state: "resolved", foregroundHex: "#222222" })
        ]
      })
    );
    expect(items.map((item) => item.kind)).toEqual(["action", "left"]);
    expect(deferredLayers).toBe(1);
  });

  it("puts important items before open ones", () => {
    const { items } = buildItems(
      input({
        findings: [
          finding(),
          finding({ issueId: "i", state: "important", foregroundHex: "#333333" })
        ]
      })
    );
    expect(items.map((item) => item.important)).toEqual([true, false]);
  });

  it("restricts to the chosen screens and keeps one item per root per screen", () => {
    const other = finding({ issueId: "o", screenId: "s2", screenName: "Cart" });
    const { items } = buildItems(
      input({ findings: [finding(), other], screens: [{ id: "s2", name: "Cart" }] })
    );
    expect(items).toHaveLength(1);
    expect(items[0].screenName).toBe("Cart");
    const both = buildItems(
      input({
        findings: [finding(), other],
        screens: [
          { id: "s1", name: "Payment" },
          { id: "s2", name: "Cart" }
        ]
      })
    );
    expect(both.items).toHaveLength(2);
  });

  it("drops a root the designer left out", () => {
    const signature = "#9A9A9A|#FFFFFF|unbound|4.5";
    const { items } = buildItems(
      input({
        findings: [finding()],
        meta: { [signature]: { signOff: "needs", leaveOut: true } }
      })
    );
    expect(items).toEqual([]);
  });

  it("attaches the root decision and default sign-off to a left item", () => {
    const { items } = buildItems(
      input({ findings: [ignoredFinding()], decisions: { [DECISION.signature]: DECISION } })
    );
    expect(items[0].decision?.reason).toContain("Brand campaign");
    expect(items[0].meta.signOff).toBe("needs");
  });
});
