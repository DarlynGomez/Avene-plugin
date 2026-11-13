import { describe, expect, it } from "vitest";

import { buildRootSignature } from "../issues/rootSignature";
import { CHECKS_LINE, NOT_COVERED_LINE } from "./fixedLines";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import { buildHandoffTable } from "./tableModel";
import { EMPTY_TABLE_SENTENCE } from "./tableTypes";
import type { HandoffChange, HandoffInput } from "./types";

const WORDS = ["Open", "Needs check", "Adjusted", "Ignored", "Decided"];
const AT = "2026-10-27T10:00:00.000Z";

const CHANGE: HandoffChange = {
  nodeName: "Continue button",
  beforeHex: "#F28C28",
  beforeRatio: 3.58,
  afterHex: "#C2410C",
  afterRatio: 5.18,
  instanceCount: 1,
  requiredRatio: 4.5,
  screenName: "Checkout",
  nodeId: "5:1"
};

function layer(id: string, name: string, screen = "Payment") {
  return {
    nodeId: id,
    name,
    screenId: "s1",
    screenName: screen,
    width: 10,
    height: 10,
    imageHash: id
  };
}

const ignoredSignature = (f = ignoredFinding()) =>
  buildRootSignature({
    foregroundHex: f.foregroundHex,
    backgroundHex: f.backgroundHex,
    foregroundBinding: f.foregroundBinding,
    requiredRatio: f.requiredRatio
  });

/** An open item, a kept one, a changed color, and two pictures, one with alt text and one without */
function five(): HandoffInput {
  const sig = ignoredSignature();
  return input({
    findings: [finding(), ignoredFinding()],
    decisions: { [sig]: { ...DECISION, signature: sig } },
    changes: [CHANGE],
    notes: [
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "A dog on a beach", updatedAt: AT }
      }
    ],
    imageLayers: [layer("9:1", "Dog photo"), layer("9:2", "Menu photo")]
  });
}

describe("a handoff with nothing in it", () => {
  const model = buildHandoffTable(input(), "developer", "abc1234");

  it("has no groups, one clear sentence", () => {
    expect(model.groups).toEqual([]);
    expect(model.empty).toBe("No findings to hand off yet.");
    expect(model.empty).toBe(EMPTY_TABLE_SENTENCE);
    expect(model.footer.notCovered).toBe(NOT_COVERED_LINE.replace("Needs check: ", ""));
    expect(model.footer.limitation).toBe(CHECKS_LINE);
  });

  it("has the file as the title, a subtitle with the day written out, and zero counts", () => {
    expect(model.header).toMatchObject({
      title: "Checkout",
      subtitle: "Accessibility handoff · 27 Oct 2026",
      buildId: "abc1234",
      counts: { rows: 0, groups: 0, needAction: 0, decided: 0 }
    });
  });
});

describe("a handoff with one item", () => {
  const model = buildHandoffTable(input({ findings: [finding()] }), "developer");

  it("has one group with one open row, and counts it as needing action", () => {
    expect(model.groups.map((g) => [g.id, g.title, g.rows.length])).toEqual([
      ["contrast", "Text contrast", 1]
    ]);
    expect(model.empty).toBeNull();
    expect(model.header.counts).toEqual({
      rows: 1,
      groups: 1,
      needAction: 1,
      decided: 0,
      deferred: 0
    });
    expect(model.header.subtitle).toBe("Accessibility handoff · 27 Oct 2026 · Payment");
  });

  it("describes the row with its measurement, its status word, and the line across the row", () => {
    const [row] = model.groups[0].rows;
    expect(row).toMatchObject({
      element: "Helper text",
      location: "Payment",
      details: [],
      contrast: { measured: "2.80:1", required: "4.5:1" },
      detail: null,
      notes: []
    });
    expect(row.status).toEqual({ kind: "open", text: "Open", needsAction: true });
  });
});

describe("a handoff with five items", () => {
  const model = buildHandoffTable(five(), "developer", "abc1234");
  const rows = model.groups.flatMap((g) => g.rows);

  it("has the groups in order, text contrast and then alt text, with the rows of each", () => {
    expect(model.groups.map((g) => [g.id, g.rows.length])).toEqual([
      ["contrast", 3],
      ["alt", 2]
    ]);
    expect(rows).toHaveLength(5);
  });

  it("puts Open and Needs check first in each group and keeps the order inside each part", () => {
    expect(model.groups[0].rows.map((r) => r.status.text)).toEqual(["Open", "Ignored", "Adjusted"]);
    expect(model.groups[1].rows.map((r) => [r.element, r.status.text])).toEqual([
      ["Menu photo", "Needs check"],
      ["Dog photo", "Decided"]
    ]);
  });

  it("counts what needs action and what is decided, which together are every row", () => {
    expect(model.header.counts).toEqual({
      rows: 5,
      groups: 2,
      needAction: 2,
      decided: 3,
      deferred: 0
    });
    expect(model.header.subtitle).toBe("Accessibility handoff · 27 Oct 2026 · Payment, Checkout");
  });

  it("gives every row one of the five status words", () => {
    for (const row of rows) expect(WORDS).toContain(row.status.text);
  });

  it("writes each kind of line across the row", () => {
    const [open, ignored, adjusted] = model.groups[0].rows;
    expect(open.detail).toBeNull();
    expect(ignored.detail).toEqual({
      text: "Brand campaign color, requested by Marketing",
      muted: false
    });
    expect(adjusted.detail).toEqual({
      text: "Fill #F28C28 changed to #C2410C. Now 5.18:1.",
      muted: false
    });
    expect(adjusted.contrast).toEqual({ measured: "3.58:1", required: "4.5:1" });
  });

  it("repeats no written explanation, and prints no None placeholder anywhere", () => {
    const written = rows.flatMap((r) => (r.detail && !r.detail.muted ? [r.detail.text] : []));
    expect(new Set(written).size).toBe(written.length);
    expect(JSON.stringify(model)).not.toMatch(/\bNone\b/);
  });
});

describe("the rows of one group", () => {
  it("lead with what needs action even when it comes last, and keep each part in its own order", () => {
    const sig = ignoredSignature();
    const model = buildHandoffTable(
      input({
        findings: [
          finding({ nodeName: "A" }),
          ignoredFinding({ nodeName: "B" }),
          finding({
            foregroundHex: "#888888",
            issueId: "contrast:3:1",
            nodeId: "3:1",
            nodeName: "C"
          })
        ],
        decisions: { [sig]: { ...DECISION, signature: sig } },
        changes: [CHANGE]
      }),
      "developer"
    );
    expect(model.groups[0].rows.map((r) => `${r.element}:${r.status.text}`)).toEqual([
      "A:Open",
      "C:Open",
      "B:Ignored",
      "Continue button:Adjusted"
    ]);
  });

  it("lists the layers and large text beside the location", () => {
    const f = finding({ requiredRatio: 3, measuredRatio: 2.49 });
    const second = finding({
      requiredRatio: 3,
      measuredRatio: 2.49,
      issueId: "contrast:1:2",
      nodeId: "1:2",
      documentOrder: 1
    });
    const [row] = buildHandoffTable(input({ findings: [f, second] }), "developer").groups[0].rows;
    expect(row.details).toEqual(["2 layers", "large text"]);
    expect(row.contrast).toEqual({ measured: "2.49:1", required: "3:1" });
  });
});

describe("the alt text group", () => {
  const withAlt = (notes: HandoffInput["notes"], layers = [layer("9:1", "Dog photo")]) =>
    buildHandoffTable(input({ notes, imageLayers: layers }), "developer").groups[0].rows;

  it("quotes the alt text, and says there is none yet with no owner when the data names none", () => {
    const [done] = withAlt([
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "A dog", updatedAt: AT }
      }
    ]);
    expect(done.detail).toEqual({ text: "“A dog”", muted: false });
    expect(withAlt([])[0].detail).toEqual({ text: "No alt text yet", muted: true });
  });

  it("names the owner from the note, never one of its own", () => {
    const [row] = withAlt([
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "", contact: "Content team", updatedAt: AT }
      }
    ]);
    expect(row.status.text).toBe("Needs check");
    expect(row.detail?.text).toBe("No alt text yet · Decides: Content team");
  });

  it("says nothing about who wrote a note the designer wrote, and keeps the wording for one a model drafted", () => {
    const [mine] = withAlt([
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "A dog", updatedAt: AT }
      }
    ]);
    expect(mine.notes).toEqual([]);
    const [drafted] = withAlt([
      {
        nodeId: "9:1",
        nodeName: "Dog photo",
        note: { category: "alt", text: "A dog", source: "ai", updatedAt: AT }
      }
    ]);
    expect(drafted.details).toEqual([]);
    expect(drafted.notes).toEqual([
      { text: "Drafted by a language model, confirmed by the designer", tone: "quiet" }
    ]);
    expect(drafted.detail?.text).toBe("\u201CA dog\u201D");
  });

  it("has no row of its own for a picture a note already speaks for", () => {
    const rows = withAlt(
      [
        {
          nodeId: "9:1",
          nodeName: "Dog photo",
          note: { category: "alt", text: "A dog", updatedAt: AT }
        }
      ],
      [layer("9:1", "Dog photo"), layer("9:2", "Menu photo")]
    );
    expect(rows.map((r) => r.element).sort()).toEqual(["Dog photo", "Menu photo"]);
  });
});

describe("what each reader gets", () => {
  const sig = ignoredSignature();
  const base = input({
    findings: [finding(), ignoredFinding()],
    decisions: { [sig]: { ...DECISION, signature: sig } },
    meta: { [sig]: { signOff: "needs", leaveOut: false } },
    changes: [CHANGE]
  });

  it("is everything for a developer and the kept items for everyone else", () => {
    expect(buildHandoffTable(base, "developer").groups[0].rows).toHaveLength(3);
    expect(buildHandoffTable(base, "pm").groups[0].rows.map((r) => r.status.text)).toEqual([
      "Ignored"
    ]);
  });

  it("leaves names out for leadership and the client, and shows leadership only what waits for a sign-off", () => {
    for (const who of ["higherUp", "client"] as const) {
      expect(buildHandoffTable(base, who).groups[0].rows[0].element).toBe("Text layer");
    }
    const signed = input({ ...base, meta: { [sig]: { signOff: "signed", leaveOut: false } } });
    expect(buildHandoffTable(signed, "higherUp").groups).toEqual([]);
  });

  it("never holds a sentence from a model unless a model's alt text is in the data", () => {
    const shown = JSON.stringify(buildHandoffTable(five(), "developer"));
    expect(shown).not.toMatch(/language model|\bAI\b/);
  });
});

describe("the lines under an open row or an alt row", () => {
  it("gives an open row no detail line at all, whoever might decide", () => {
    const [row] = buildHandoffTable(input({ findings: [finding()] }), "developer").groups[0].rows;
    expect(row.detail).toBeNull();
    expect(row.notes).toEqual([]);
  });

  it("names a decider only when it is not the designer", () => {
    const owned = (contact: string) =>
      buildHandoffTable(
        input({
          notes: [
            {
              nodeId: "9:1",
              nodeName: "Dog photo",
              note: { category: "alt", text: "", contact, updatedAt: AT }
            }
          ],
          imageLayers: [layer("9:1", "Dog photo")]
        }),
        "developer"
      ).groups[0].rows[0].detail?.text;
    expect(owned("Designer")).toBe("No alt text yet");
    expect(owned("")).toBe("No alt text yet");
    expect(owned("Content team")).toBe("No alt text yet · Decides: Content team");
  });
});

describe("what an ignored row says about the decision", () => {
  const sig = ignoredSignature();
  const withMeta = (
    meta: HandoffInput["meta"][string] | undefined,
    findings = [ignoredFinding()]
  ) =>
    buildHandoffTable(
      input({
        findings,
        decisions: { [sig]: { ...DECISION, signature: sig } },
        meta: meta ? { [sig]: meta } : {}
      }),
      "developer"
    ).groups[0].rows[0];
  const FULL = {
    signOff: "needs" as const,
    leaveOut: false,
    mitigation: "Larger type on mobile",
    revisitTrigger: "the campaign ends",
    decidedBy: "Sam Lee"
  };

  it("prints the reason, then mitigation, revisit and decided by, each only when it exists", () => {
    const row = withMeta(FULL);
    expect(row.detail?.text).toBe("Brand campaign color, requested by Marketing");
    expect(row.notes.map((n) => [n.text, n.tone])).toEqual([
      ["Mitigation: Larger type on mobile", "quiet"],
      ["Revisit: the campaign ends", "quiet"],
      ["Decided by Sam Lee, 27 Oct 2026", "quiet"]
    ]);
    expect(withMeta({ signOff: "needs", leaveOut: false, revisitTrigger: "later" }).notes).toEqual([
      { text: "Revisit: later", tone: "quiet" }
    ]);
    expect(withMeta(undefined).notes).toEqual([]);
  });

  it("adds the worse line, in normal weight and first, only when the flag is true", () => {
    const worse = withMeta(FULL, [ignoredFinding({ changedSinceIgnore: true, severity: "high" })]);
    expect(worse.notes[0]).toEqual({
      text: "Worse since it was decided: medium then, high now.",
      tone: "normal"
    });
    expect(worse.notes).toHaveLength(4);
    expect(withMeta(FULL, [ignoredFinding({ changedSinceIgnore: false })]).notes).toHaveLength(3);
    expect(worse.status.text).toBe("Ignored");
  });
});

describe("deferred layers", () => {
  const deferred = (n: number) =>
    input({
      findings: [
        finding(),
        ...Array.from({ length: n }, (_, i) =>
          finding({ issueId: `contrast:d${i}:1`, nodeId: `d${i}:1`, state: "deferred" })
        )
      ]
    });

  it.each([0, 1, 2])("are counted and never listed when there are %i", (n) => {
    const model = buildHandoffTable(deferred(n), "developer");
    const rows = model.groups.flatMap((g) => g.rows);
    expect(rows).toHaveLength(1);
    expect(model.header.counts.deferred).toBe(n);
    expect(model.header.counts.needAction + model.header.counts.decided).toBe(rows.length);
  });
});
