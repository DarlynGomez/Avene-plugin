import { describe, expect, it } from "vitest";

import { buildDoc, renderDoc } from "./buildDoc";
import { advisorySection } from "./sectionLines";
import { buildItems } from "./buildItems";
import { createSlots } from "./slots";
import { startsWithLabel } from "./labels";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import type { HandoffInput } from "./types";

const SIGNATURE = DECISION.signature;

function rich(overrides: Partial<HandoffInput> = {}): HandoffInput {
  return input({
    findings: [
      finding({ link: "https://www.figma.com/design/KEY/Checkout?node-id=1-1" }),
      finding({
        issueId: "x",
        nodeId: "1:2",
        state: "important",
        foregroundHex: "#777777",
        foregroundBinding: "text/muted"
      }),
      finding({
        issueId: "x2",
        nodeId: "1:3",
        state: "important",
        foregroundHex: "#777777",
        foregroundBinding: "text/muted"
      }),
      finding({ issueId: "d", state: "deferred", foregroundHex: "#111111" }),
      ignoredFinding()
    ],
    decisions: { [SIGNATURE]: DECISION },
    changes: [
      {
        nodeName: "Title",
        beforeHex: "#AAAAAA",
        beforeRatio: 2.3,
        afterHex: "#595959",
        afterRatio: 7,
        instanceCount: 2
      }
    ],
    questions: [{ text: "Where does focus go after Apply?", owner: "Dev" }],
    reviewer: { name: "Sam Lee", date: "2026-10-27T13:00:00.000Z" },
    ...overrides
  });
}

function bodyLines(text: string): string[] {
  const lines = text.split("\n");
  const firstBlank = lines.indexOf("");
  return lines.slice(firstBlank + 1).filter((line) => line !== "" && !line.startsWith("## "));
}

describe("buildDoc", () => {
  it("puts a label on every non-header, non-heading line", () => {
    const text = renderDoc(buildDoc(rich()));
    for (const line of bodyLines(text)) {
      expect(startsWithLabel(line), line).toBe(true);
    }
  });

  it("keeps each logical line on one physical line", () => {
    const text = renderDoc(buildDoc(rich()));
    expect(text).not.toMatch(/\n[ \t]+\S/);
  });

  it("counts the summary from the items", () => {
    const text = renderDoc(buildDoc(rich()));
    expect(text).toContain(
      "Detected: 2 text contrast items need developer action (2 color pairs, 3 layers)."
    );
    expect(text).toContain(
      "Detected: 1 knowingly left as-is, 1 waiting for sign-off. 1 deferred (not for developers now)."
    );
    expect(text).toContain("Detected: Highest severity open: medium.");
    expect(text).toContain("Needs check: 1 question open.");
  });

  it("says nothing needs action and leaves empty lines out", () => {
    const text = renderDoc(buildDoc(input()));
    expect(text).toContain(
      "Detected: No text contrast items need developer action in the chosen screens."
    );
    expect(text).not.toContain("severity");
    expect(text).not.toContain("question");
    expect(text).not.toContain("## Needs developer action");
  });

  it("prints a measured line with ratios cut, the binding and the link", () => {
    const text = renderDoc(buildDoc(rich()));
    expect(text).toContain(
      'Detected: "Helper text" on Payment: text #9A9A9A on #FFFFFF, measured 2.8:1, needs 4.5:1 (WCAG 1.4.3). This is the only layer on this screen with this pair. Not bound to a variable. Link: https://www.figma.com/design/KEY/Checkout?node-id=1-1'
    );
    expect(text).toContain("2 layers on this screen share this pair. Bound to text/muted.");
    const cut = renderDoc(buildDoc(input({ findings: [finding({ measuredRatio: 4.4999 })] })));
    expect(cut).toContain("measured 4.49:1");
  });

  it("prints a left item with its reason on one line and status that needs sign-off", () => {
    const text = renderDoc(buildDoc(rich()));
    expect(text).toContain(
      "Decision: Brand campaign color, requested by Marketing (recorded 2026-10-27)"
    );
    expect(text).toContain("Needs check: Status: Needs sign-off.");
  });

  it("switches the status line to Decision once signed off", () => {
    const text = renderDoc(
      buildDoc(
        rich({
          meta: {
            [SIGNATURE]: {
              signOff: "signed",
              signedBy: "Jo PM",
              signedAt: "2026-10-28T09:00:00Z",
              leaveOut: false
            }
          }
        })
      )
    );
    expect(text).toContain("Decision: Signed off by Jo PM, 2026-10-28.");
    expect(text).not.toContain("Status: Needs sign-off");
    expect(text).toContain("0 waiting for sign-off");
  });

  it("prints optional handoff fields only when filled", () => {
    const empty = renderDoc(buildDoc(rich()));
    expect(empty).not.toContain("Mitigation");
    expect(empty).not.toContain("Decided by");
    expect(empty).not.toContain("Revisit");
    const filled = renderDoc(
      buildDoc(
        rich({
          meta: {
            [SIGNATURE]: {
              signOff: "needs",
              mitigation: "Same offer in the summary",
              decidedBy: "Sam Lee",
              revisitTrigger: "Before launch",
              leaveOut: false
            }
          }
        })
      )
    );
    expect(filled).toContain("Decision: Mitigation: Same offer in the summary");
    expect(filled).toContain("Decision: Decided by Sam Lee. Revisit: Before launch");
  });

  it("says a reason was not recorded when no decision exists", () => {
    const text = renderDoc(buildDoc(rich({ decisions: {} })));
    expect(text).toContain("Decision: Reason: not recorded.");
  });

  it("notes a root that got worse since it was decided", () => {
    const text = renderDoc(
      buildDoc(
        rich({
          findings: [ignoredFinding({ changedSinceIgnore: true, severity: "high" })],
          decisions: { [SIGNATURE]: DECISION }
        })
      )
    );
    expect(text).toContain("Detected: Worse since it was decided: medium then, high now.");
  });

  it("excludes left out roots from the lines and the counts", () => {
    const text = renderDoc(
      buildDoc(rich({ meta: { [SIGNATURE]: { signOff: "needs", leaveOut: true } } }))
    );
    expect(text).not.toContain("Promo banner");
    expect(text).not.toContain("knowingly left as-is");
  });

  it("builds the header with no hash and a reviewer only after the gate", () => {
    const withReviewer = renderDoc(buildDoc(rich())).split("\n");
    expect(withReviewer.slice(0, 4)).toEqual([
      "Accessibility handoff: Checkout, Payment",
      "Generated by Avene 2026-10-27T12:00:00.000Z",
      "Reviewed by Sam Lee, 2026-10-27",
      "Checks: text contrast (WCAG 1.4.3), design file only"
    ]);
    const without = buildDoc(rich({ reviewer: undefined })).header;
    expect(without.some((line) => line.startsWith("Reviewed by"))).toBe(false);
    expect(without.join("\n")).not.toMatch(/hash/i);
  });

  it("hides the advisory section today and shows it for another condition", () => {
    const doc = buildDoc(rich());
    expect(doc.sections.some((s) => s.id === "advisory")).toBe(false);
    const { items } = buildItems(rich());
    const odd = [{ ...items[0], condition: "night" } as unknown as (typeof items)[number]];
    const section = advisorySection(odd, createSlots());
    expect(section?.lines[0]).toBe("Needs check: Inference, not a measured failure.");
  });

  it("never claims compliance or cites a version", () => {
    const text = renderDoc(buildDoc(rich()));
    expect(text).not.toMatch(/\b(meets|passes|compliant|ignored|violated|minor)\b/i);
    expect(text).not.toContain("WCAG 2.2");
    expect(text).not.toMatch(/[—–]/);
    expect(text.match(/WCAG \d/g)?.every((m) => m === "WCAG 1")).toBe(true);
  });
});
