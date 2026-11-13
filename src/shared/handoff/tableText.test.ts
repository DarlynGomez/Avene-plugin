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
    expect(body).toMatch(/2\.80:1 needs 4\.5:1 +\| Open +\| No decision yet · Decides: designer/);
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

  it("ends with the Not covered note, without its label, and then the build", () => {
    const lines = text().split("\n");
    expect(lines.at(-2)).toMatch(/^Not covered by this check: keyboard behavior/);
    expect(lines.at(-1)).toBe("Build abc1234");
    expect(text(mixed(), null).split("\n").at(-1)).toMatch(/^Not covered by this check/);
  });

  it("keeps a pipe in a cell from breaking the columns", () => {
    expect(text(input({ findings: [finding({ nodeName: "A | B" })] }))).toContain("A/B");
  });

  it("says there is nothing when there is nothing, and still ends with the footer", () => {
    const empty = text(input(), "abc1234");
    expect(empty).toContain("No findings to hand off yet.");
    expect(empty).not.toMatch(/\(\d+\)/);
    expect(empty).toContain("Not covered by this check");
  });
});
