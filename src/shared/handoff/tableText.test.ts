import { describe, expect, it } from "vitest";

import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import { buildRootSignature } from "../issues/rootSignature";
import { buildHandoffTable } from "./tableModel";
import { renderTableText } from "./tableText";
import type { HandoffInput } from "./types";

const AT = "2026-10-27T10:00:00.000Z";
const sig = (f = ignoredFinding()) =>
  buildRootSignature({
    foregroundHex: f.foregroundHex,
    backgroundHex: f.backgroundHex,
    foregroundBinding: f.foregroundBinding,
    requiredRatio: f.requiredRatio
  });

function mixed(): HandoffInput {
  const s = sig();
  return input({
    findings: [finding(), ignoredFinding()],
    decisions: { [s]: { ...DECISION, signature: s } },
    changes: [
      {
        nodeName: "Continue button",
        beforeHex: "#F28C28",
        beforeRatio: 3.58,
        afterHex: "#C2410C",
        afterRatio: 5.18,
        instanceCount: 1,
        requiredRatio: 4.5,
        screenName: "Checkout",
        nodeId: "5:1"
      }
    ],
    notes: [
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "A dog", updatedAt: AT }
      }
    ],
    imageLayers: [
      {
        nodeId: "9:1",
        name: "Dog photo",
        screenId: "s1",
        screenName: "Payment",
        width: 1,
        height: 1,
        imageHash: "a"
      },
      {
        nodeId: "9:2",
        name: "Menu photo",
        screenId: "s1",
        screenName: "Payment",
        width: 1,
        height: 1,
        imageHash: "b"
      }
    ]
  });
}

const text = (source = mixed(), buildId: string | null = "abc1234") =>
  renderTableText(buildHandoffTable(source, "developer", buildId));

describe("renderTableText", () => {
  it("opens with the title, the subtitle and the count line, as the screen does", () => {
    const lines = text().split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "Checkout",
      "Accessibility handoff · 27 Oct 2026 · Payment, Checkout",
      "2 need action, 3 decided"
    ]);
  });

  it("follows the groups and the row order of the model, each group with its count", () => {
    const model = buildHandoffTable(mixed(), "developer");
    const lines = text().split("\n");
    const heads = lines.filter((line) => /^(Text contrast|Alt text) \(\d+\)$/.test(line));
    expect(heads).toEqual(model.groups.map((g) => `${g.title} (${g.rows.length})`));
    const contrast = lines.slice(
      lines.indexOf("Text contrast (3)") + 3,
      lines.indexOf("Alt text (2)") - 1
    );
    expect(contrast.map((line) => line.split(" | ")[0].trim())).toEqual(
      model.groups[0].rows.map((r) => r.element)
    );
    const alt = lines.slice(lines.indexOf("Alt text (2)") + 3, lines.indexOf("Alt text (2)") + 5);
    expect(alt.map((line) => line.split(" | ")[0].trim())).toEqual(
      model.groups[1].rows.map((r) => r.element)
    );
  });

  it("has one line for each item with its fields, the line across the row included", () => {
    const body = text();
    expect(body).toContain("Helper text");
    expect(body).toMatch(/2\.80:1 needs 4\.5:1 +\| Open( |$)/m);
    expect(body).not.toContain("No decision yet");
    expect(body).toContain("Fill #F28C28 changed to #C2410C. Now 5.18:1.");
    expect(body).toContain("Brand campaign color, requested by Marketing");
    expect(body).toContain("“A dog”");
    expect(body).toMatch(/Menu photo +\| Payment +\| Needs check +\| No alt text yet/);
  });

  it("has no shapes, no ISO date and no None placeholder", () => {
    const body = text();
    expect(body).not.toMatch(/[▲■◆]/);
    expect(body).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(body).not.toMatch(/\bNone\b/);
  });

  it("ends with the build and holds no Not covered note", () => {
    const lines = text().split("\n");
    expect(lines.at(-1)).toBe("Build abc1234");
    expect(text()).not.toContain("Not covered by this check");
    expect(text(mixed(), null)).not.toContain("Build ");
  });

  it("keeps a pipe in a cell from breaking the columns", () => {
    expect(text(input({ findings: [finding({ nodeName: "A | B" })] }))).toContain("A/B");
  });

  it("says there is nothing when there is nothing", () => {
    const empty = text(input(), "abc1234");
    expect(empty).toContain("No findings to hand off yet.");
    expect(empty).not.toMatch(/\(\d+\)/);
  });
});

describe("the count line of the copied text", () => {
  it("adds the deferred part only when something was deferred", () => {
    const plain = renderTableText(buildHandoffTable(input({ findings: [finding()] }), "developer"));
    expect(plain).toContain("1 need action, 0 decided\n");
    const deferred = renderTableText(
      buildHandoffTable(
        input({
          findings: [finding(), finding({ issueId: "d:1", nodeId: "d:1", state: "deferred" })]
        }),
        "developer"
      )
    );
    expect(deferred).toContain("1 need action, 0 decided, 1 deferred, not listed");
  });
});

describe("the review line and the link column of the copied text", () => {
  it("puts the review line right under the count line, and who reviewed it when someone did", () => {
    const plain = renderTableText(buildHandoffTable(input({ findings: [finding()] }), "developer"));
    expect(plain.split("\n")[3]).toBe("Not yet reviewed by a person.");
    const reviewed = renderTableText(
      buildHandoffTable(
        input({ findings: [finding()], reviewer: { name: "Priya N.", date: AT } }),
        "developer"
      )
    );
    expect(reviewed.split("\n")[3]).toBe("Reviewed by Priya N., 27 Oct 2026");
    expect(reviewed).not.toContain("Not yet reviewed");
  });

  it("adds a Link column only when a file address was pasted", () => {
    const base = input({ findings: [finding()] });
    expect(renderTableText(buildHandoffTable(base, "developer"))).not.toMatch(/\| Link/);
    const linked = renderTableText(
      buildHandoffTable(
        { ...base, fileUrl: "https://www.figma.com/design/AbC123xyz/My-file" },
        "developer"
      )
    );
    expect(linked).toMatch(/\| Link/);
    expect(linked).toContain("https://www.figma.com/design/AbC123xyz/My-file?node-id=1-1");
  });
});
