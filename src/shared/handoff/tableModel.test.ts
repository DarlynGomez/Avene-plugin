import { describe, expect, it } from "vitest";

import { buildRootSignature } from "../issues/rootSignature";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import { CHECKS_LINE, NOT_COVERED_LINE } from "./fixedLines";
import { LABELS } from "./labels";
import { buildHandoffTable } from "./tableModel";
import { EMPTY_TABLE_SENTENCE } from "./tableTypes";
import type { HandoffInput } from "./types";

const pair = (hex: string) =>
  finding({ foregroundHex: hex, issueId: `contrast:${hex.slice(1)}`, nodeId: hex.slice(1) });

/** Five open color pairs, five different roots */
function five(): HandoffInput {
  const hexes = ["#999999", "#8A8A8A", "#AAAAAA", "#9C9C9C", "#B0B0B0"];
  return input({
    findings: hexes
      .map((hex) => pair(hex))
      .map((f, i) => ({ ...f, documentOrder: i, nodeName: `Layer ${i + 1}` }))
  });
}

describe("a handoff with nothing in it", () => {
  const model = buildHandoffTable(input(), "developer", "abc1234");

  it("has no groups, one clear sentence, and still the footer", () => {
    expect(model.groups).toEqual([]);
    expect(model.empty).toBe("No findings to hand off yet.");
    expect(model.empty).toBe(EMPTY_TABLE_SENTENCE);
    expect(model.footer.notCovered).toBe(NOT_COVERED_LINE);
    expect(model.footer.limitation).toBe(CHECKS_LINE);
    expect(model.header.counts).toMatchObject({ rows: 0, groups: 0 });
  });

  it("says who made it, when, and which build", () => {
    expect(model.header).toMatchObject({
      fileName: "Checkout",
      screens: ["Payment"],
      date: "2026-10-27",
      buildId: "abc1234"
    });
  });
});

describe("a handoff with one item", () => {
  const model = buildHandoffTable(input({ findings: [finding()] }), "developer");

  it("has one group with one row and no empty sentence", () => {
    expect(model.groups.map((g) => [g.id, g.title, g.rows.length])).toEqual([
      ["contrast", "Text contrast", 1]
    ]);
    expect(model.empty).toBeNull();
    expect(model.header.counts).toMatchObject({ rows: 1, groups: 1, detected: 1 });
  });

  it("describes the row with its measurement and its status in words and a shape", () => {
    const [row] = model.groups[0].rows;
    expect(row).toMatchObject({
      element: "Helper text",
      location: "Payment",
      measured: "2.8:1",
      required: "4.5:1",
      decision: "",
      decidedBy: "Dev"
    });
    expect(row.status).toEqual({ label: "Detected", text: "Detected", shape: "triangle" });
  });

  it("keeps the footer", () => {
    expect(model.footer.notCovered).toBe(NOT_COVERED_LINE);
  });
});

describe("a handoff with five items", () => {
  const model = buildHandoffTable(five(), "developer");
  const rows = model.groups.flatMap((g) => g.rows);

  it("has one row for each of the five color pairs, in one group", () => {
    expect(rows).toHaveLength(5);
    expect(model.groups).toHaveLength(1);
    expect(new Set(rows.map((r) => r.id)).size).toBe(5);
    expect(model.header.counts.rows).toBe(5);
  });

  it("gives every row a status in words from the three labels, and a shape", () => {
    for (const row of rows) {
      expect(LABELS).toContain(row.status.label);
      expect(row.status.text.length).toBeGreaterThan(0);
      expect(["triangle", "square", "diamond"]).toContain(row.status.shape);
    }
  });

  it("repeats no explanation, since nothing is explained twice", () => {
    const words = rows.flatMap((r) => [r.decision, r.note]).filter((text) => text !== "");
    expect(new Set(words).size).toBe(words.length);
  });
});

describe("the groups", () => {
  const withAlt = input({
    findings: [finding()],
    notes: [
      {
        nodeId: "9:1",
        nodeName: "Hero image",
        note: { category: "alt", text: "A bowl of fruit", updatedAt: "2026-10-27T10:00:00.000Z" }
      }
    ],
    imageLayers: [
      {
        nodeId: "9:1",
        name: "Hero image",
        screenId: "s1",
        screenName: "Payment",
        width: 10,
        height: 10,
        imageHash: "a"
      },
      {
        nodeId: "9:2",
        name: "Logo",
        screenId: "s1",
        screenName: "Payment",
        width: 10,
        height: 10,
        imageHash: "b"
      },
      {
        nodeId: "9:3",
        name: "Badge",
        screenId: "s1",
        screenName: "Payment",
        width: 10,
        height: 10,
        imageHash: "c"
      }
    ]
  });

  it("come in the same order every time, text contrast and then alt text, and an empty one is left out", () => {
    const model = buildHandoffTable(withAlt, "developer");
    expect(model.groups.map((g) => g.id)).toEqual(["contrast", "alt"]);
    expect(
      buildHandoffTable(input({ findings: [finding()] }), "developer").groups.map((g) => g.id)
    ).toEqual(["contrast"]);
  });

  it("have a row for each alt note and each picture nobody has spoken for, with no shared sentence", () => {
    const alt = buildHandoffTable(withAlt, "developer").groups[1].rows;
    expect(alt.map((r) => [r.element, r.status.label])).toEqual([
      ["Hero image", "Decision"],
      ["Logo", "Needs check"],
      ["Badge", "Needs check"]
    ]);
    const sentences = alt.map((r) => r.decision).filter((text) => text !== "");
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("show alt text to a developer only, like the other versions", () => {
    expect(buildHandoffTable(withAlt, "pm").groups.map((g) => g.id)).not.toContain("alt");
  });
});

describe("what each reader gets", () => {
  const ignored = ignoredFinding();
  const sig = buildRootSignature({
    foregroundHex: ignored.foregroundHex,
    backgroundHex: ignored.backgroundHex,
    foregroundBinding: ignored.foregroundBinding,
    requiredRatio: ignored.requiredRatio
  });
  const base = input({
    findings: [finding(), ignored],
    decisions: { [sig]: { ...DECISION, signature: sig } },
    meta: { [sig]: { signOff: "needs", leaveOut: false, decidedBy: "Marketing" } }
  });

  it("is the open items for a developer and the left-as-is items for everyone else", () => {
    expect(buildHandoffTable(base, "developer").groups[0].rows.map((r) => r.element)).toEqual([
      "Helper text"
    ]);
    expect(buildHandoffTable(base, "pm").groups[0].rows.map((r) => r.element)).toEqual([
      "Promo banner"
    ]);
  });

  it("shows a left-as-is item's decision, who decided and its status, Needs check until it is signed", () => {
    const [row] = buildHandoffTable(base, "pm").groups[0].rows;
    expect(row).toMatchObject({
      decision: "Brand campaign color, requested by Marketing",
      decidedBy: "Marketing"
    });
    expect(row.status).toMatchObject({
      label: "Needs check",
      text: "Still to check",
      shape: "diamond"
    });
    const signed = input({
      ...base,
      meta: { [sig]: { signOff: "signed", leaveOut: false, signedBy: "Sam" } }
    });
    expect(buildHandoffTable(signed, "pm").groups[0].rows[0].status).toMatchObject({
      label: "Decision",
      text: "Decided",
      shape: "square"
    });
  });

  it("leaves names out for leadership and the client", () => {
    for (const who of ["higherUp", "client"] as const) {
      const [row] = buildHandoffTable(base, who).groups[0].rows;
      expect(row.element).toBe("Text layer");
    }
  });

  it("shows leadership only what is waiting for a sign-off", () => {
    const signed = input({ ...base, meta: { [sig]: { signOff: "signed", leaveOut: false } } });
    expect(buildHandoffTable(signed, "higherUp").groups).toEqual([]);
    expect(buildHandoffTable(signed, "higherUp").empty).toBe("No findings to hand off yet.");
  });
});

describe("what is never in the table", () => {
  it("holds no color code and no sentence from a model in anything that is shown", () => {
    const model = buildHandoffTable(five(), "developer");
    // The row id is the root signature, which is never printed
    const shown = JSON.stringify({
      ...model,
      groups: model.groups.map((g) => ({ ...g, rows: g.rows.map((row) => ({ ...row, id: "" })) }))
    });
    expect(shown).not.toMatch(/#[0-9A-Fa-f]{6}/);
    expect(shown).not.toMatch(/language model|\bAI\b/);
  });
});
