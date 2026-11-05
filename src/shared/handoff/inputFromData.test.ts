import { describe, expect, it } from "vitest";

import { buildDoc, renderDoc } from "./buildDoc";
import type { HandoffDataMessage } from "./handoffMessages";
import { inputFromData, liveSignatures } from "./inputFromData";
import type { IssueSummary } from "../issues/issueTypes";

function issue(id: string, name: string, over: Partial<IssueSummary> = {}): IssueSummary {
  return {
    id: `contrast:${id}`,
    ruleId: "contrast",
    nodeId: id,
    nodeName: name,
    screenId: "s1",
    screenName: "Payment",
    state: "open",
    severityAtLastDetection: "medium",
    encounterCount: 0,
    lastDetectedAt: "2026-10-28T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.8,
      requiredRatio: 4.5,
      foregroundHex: "#9A9A9A",
      backgroundHex: "#FFFFFF",
      foregroundBinding: null
    },
    ...over
  };
}

function data(over: Partial<HandoffDataMessage> = {}): HandoffDataMessage {
  return {
    type: "HANDOFF_DATA",
    generatedAt: "2026-10-28T12:00:00.000Z",
    fileName: "Checkout",
    issues: [issue("1:1", "Helper text")],
    decisions: {},
    adjustLog: [],
    notes: {},
    noteNames: {},
    meta: {},
    fileUrl: null,
    drafts: {},
    ...over
  };
}

describe("inputFromData", () => {
  it("makes findings, screens and no links without a file address", () => {
    const input = inputFromData(data());
    expect(input.screens).toEqual([{ id: "s1", name: "Payment" }]);
    expect(input.findings[0].link).toBeUndefined();
    expect(input.fileUrl).toBeUndefined();
  });

  it("adds links from the file address, with colons as dashes", () => {
    const input = inputFromData(data({ fileUrl: "https://www.figma.com/design/KEY/Checkout" }));
    expect(input.findings[0].link).toBe("https://www.figma.com/design/KEY/Checkout?node-id=1-1");
  });

  it("limits to chosen screens and carries the reviewer", () => {
    const two = data({
      issues: [issue("1:1", "A"), issue("2:1", "B", { screenId: "s2", screenName: "Cart" })]
    });
    expect(inputFromData(two, { screenIds: ["s2"] }).screens).toEqual([{ id: "s2", name: "Cart" }]);
    expect(inputFromData(two, { reviewer: { name: "Sam", date: "d" } }).reviewer?.name).toBe("Sam");
  });

  it("keeps the worse-since flag from the issue", () => {
    const input = inputFromData(
      data({ issues: [issue("1:1", "A", { state: "ignored", changedSinceIgnore: true })] })
    );
    expect(input.findings[0].changedSinceIgnore).toBe(true);
  });

  it("turns applied adjustments into changes and skips abandoned and orphaned ones", () => {
    const base = {
      beforeHex: "#9A9A9A",
      beforeRatio: 2.8,
      afterHex: "#595959",
      afterRatio: 7,
      instanceCount: 2,
      loggedAt: "t"
    };
    const input = inputFromData(
      data({
        adjustLog: [
          { ...base, issueId: "contrast:1:1", optionChosen: "a", abandoned: false },
          {
            ...base,
            issueId: "contrast:1:1",
            optionChosen: null,
            abandoned: true,
            afterHex: null,
            afterRatio: null
          },
          { ...base, issueId: "contrast:9:9", optionChosen: "a", abandoned: false }
        ]
      })
    );
    expect(input.changes).toEqual([
      {
        nodeName: "Helper text",
        beforeHex: "#9A9A9A",
        beforeRatio: 2.8,
        afterHex: "#595959",
        afterRatio: 7,
        instanceCount: 2
      }
    ]);
  });

  it("splits notes into questions and the other notes, and both print in the document", () => {
    const at = "2026-10-28T10:00:00.000Z";
    const input = inputFromData(
      data({
        notes: {
          "5:1": [
            { category: "alt", text: "A cafe sign", updatedAt: at },
            { category: "heading", text: "Payment", headingLevel: 1, updatedAt: at },
            { category: "question", text: "Where does focus go?", owner: "Dev", updatedAt: at }
          ],
          "5:2": [{ category: "alt", text: "", decorative: true, updatedAt: at }]
        },
        noteNames: { "5:1": "Hero", "5:2": "Logo" }
      })
    );
    expect(input.questions).toEqual([{ text: "Where does focus go?", owner: "Dev" }]);
    expect(input.notes).toHaveLength(3);
    const text = renderDoc(buildDoc(input));
    expect(text).toContain('Decision: Alt text for "Hero": A cafe sign');
    expect(text).toContain('Decision: Heading level 1 for "Hero": Payment');
    expect(text).toContain('Decision: "Logo" is decorative, alt is empty');
    expect(text).toContain("Needs check (owner: Dev): Where does focus go?");
  });

  it("lists the live signatures of every root, whatever its state", () => {
    const live = liveSignatures(
      data({
        issues: [
          issue("1:1", "A"),
          issue("1:2", "B", {
            state: "deferred",
            evidence: {
              measuredRatio: 2,
              requiredRatio: 4.5,
              foregroundHex: "#111111",
              backgroundHex: "#FFFFFF",
              foregroundBinding: null
            }
          })
        ]
      })
    );
    expect([...live].sort()).toEqual([
      "#111111|#FFFFFF|unbound|4.5",
      "#9A9A9A|#FFFFFF|unbound|4.5"
    ]);
  });
});
