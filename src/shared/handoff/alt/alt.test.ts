import { describe, expect, it } from "vitest";

import { buildDoc, renderDoc } from "../buildDoc";
import { DECISION, finding, input } from "../handoffFixtures";
import { startsWithLabel } from "../labels";
import { createSlots } from "../slots";
import type { HandoffNote } from "../types";
import { applyAlt } from "./altNote";
import { altLines } from "./altLines";
import { groupByImageHash } from "./altGroups";
import { isAltInventoryMessage, isAltUiMessage } from "./altMessages";
import { altStatusOf, summarizeAlt, withStatus } from "./altStatus";
import type { ImageLayer } from "./altTypes";

const AT = "2026-11-04T10:00:00.000Z";
const layer = (nodeId: string, imageHash: string, screenId = "s1"): ImageLayer => ({
  nodeId,
  name: `Layer ${nodeId}`,
  screenId,
  screenName: screenId === "s1" ? "Payment" : "Cart",
  width: 100,
  height: 50,
  imageHash
});
const note = (nodeId: string, over: Partial<HandoffNote["note"]> = {}): HandoffNote => ({
  nodeId,
  nodeName: `Layer ${nodeId}`,
  note: { category: "alt", text: "A cafe sign", updatedAt: AT, ...over }
});

describe("groupByImageHash", () => {
  it("groups by hash in first-seen order and drops no layer", () => {
    const layers = [layer("1", "a"), layer("2", "b"), layer("3", "a")];
    const groups = groupByImageHash(layers);
    expect(groups.map((g) => [g.imageHash, g.layers.map((l) => l.nodeId)])).toEqual([
      ["a", ["1", "3"]],
      ["b", ["2"]]
    ]);
  });
  it("is empty for no layers", () => expect(groupByImageHash([])).toEqual([]));
});

describe("alt status", () => {
  it("is answered, decorative or unanswered from the alt note alone", () => {
    expect(altStatusOf(undefined)).toBe("unanswered");
    expect(altStatusOf([{ category: "name", text: "Menu", updatedAt: AT }])).toBe("unanswered");
    expect(altStatusOf([{ category: "alt", text: "  ", updatedAt: AT }])).toBe("unanswered");
    expect(altStatusOf([{ category: "alt", text: "A sign", updatedAt: AT }])).toBe("answered");
    expect(altStatusOf([{ category: "alt", text: "", decorative: true, updatedAt: AT }])).toBe(
      "decorative"
    );
  });

  it("counts overall and per screen, the screens in first-seen order", () => {
    const layers = withStatus(
      [layer("1", "a"), layer("2", "b"), layer("3", "c", "s2"), layer("4", "d", "s2")],
      {
        "1": [{ category: "alt", text: "A sign", updatedAt: AT }],
        "3": [{ category: "alt", text: "", decorative: true, updatedAt: AT }]
      }
    );
    expect(summarizeAlt(layers)).toEqual({
      unanswered: 2,
      answered: 1,
      decorative: 1,
      perScreen: [
        { screenId: "s1", screenName: "Payment", unanswered: 1, answered: 1, decorative: 0 },
        { screenId: "s2", screenName: "Cart", unanswered: 1, answered: 0, decorative: 1 }
      ]
    });
  });
});

describe("altLines", () => {
  const lines = (notes: HandoffNote[], layers: ImageLayer[]) => {
    const slots = createSlots();
    return { out: altLines(notes, layers, slots), table: slots.table() };
  };

  it("prints an answered layer, a decorative layer and one count for the rest", () => {
    const { out } = lines(
      [note("1"), note("2", { text: "", decorative: true })],
      [layer("1", "a"), layer("2", "b"), layer("3", "c"), layer("4", "d")]
    );
    expect(out).toEqual([
      'Decision: Alt text for "{L1}": {w1}',
      'Decision: "{L2}" is decorative, alt is empty',
      "Needs check: {n1} image layers have no alt text note or decorative mark yet. Avene cannot judge alt text quality."
    ]);
  });

  it("says one layer in the singular and prints no count when every layer is answered", () => {
    expect(lines([], [layer("1", "a")]).out[0]).toContain("{n1} image layer has no alt text");
    expect(lines([note("1")], [layer("1", "a")]).out).toHaveLength(1);
    expect(lines([], []).out).toEqual([]);
  });

  it("keeps values in slots, never in the line", () => {
    const { out, table } = lines([note("1")], [layer("1", "a"), layer("2", "b")]);
    expect(out.join("\n")).not.toContain("cafe");
    expect(Object.values(table)).toEqual(expect.arrayContaining(["Layer 1", "A cafe sign", "1"]));
  });

  it("starts every line with a label and never calls a layer failed or missing", () => {
    const { out } = lines([note("1")], [layer("1", "a"), layer("2", "b")]);
    for (const line of out) expect(startsWithLabel(line), line).toBe(true);
    expect(out.join(" ")).not.toMatch(/\b(fail|failed|missing|violation)\b/i);
  });

  it("adds the owner and link after a decorative mark with one full stop", () => {
    const { out } = lines(
      [
        {
          ...note("1", { text: "", decorative: true, contact: "Sam, PM" }),
          link: "https://x.test/a"
        }
      ],
      []
    );
    expect(out[0]).toBe('Decision: "{L1}" is decorative, alt is empty. Owner: {p1}. Link: {k1}');
  });
});

describe("alt lines in the document", () => {
  const base = (notes: HandoffNote[], layers: ImageLayer[]) =>
    buildDoc(
      input({
        findings: [finding()],
        decisions: { [DECISION.signature]: DECISION },
        notes,
        imageLayers: layers
      })
    );

  it("has an Alt text section, and alt notes are not printed under Designer notes too", () => {
    const doc = base(
      [note("1"), { nodeName: "Title", note: { category: "name", text: "Menu", updatedAt: AT } }],
      [layer("1", "a")]
    );
    const text = renderDoc(doc);
    expect(doc.sections.map((s) => s.id)).toEqual(expect.arrayContaining(["notes", "alt"]));
    expect(text.match(/Alt text for/g)).toHaveLength(1);
    expect(doc.sections.find((s) => s.id === "notes")?.lines).toHaveLength(1);
  });

  it("leaves the section out when there are no alt notes and no image layers", () => {
    expect(base([], []).sections.some((s) => s.id === "alt")).toBe(false);
  });

  it("changes the structure hash and the findings hash when an alt note is added, edited or marked decorative", () => {
    const layers = [layer("1", "a")];
    const none = base([], layers);
    const added = base([note("1")], layers);
    const edited = base([note("1", { text: "A different sign" })], layers);
    const decorative = base([note("1", { text: "", decorative: true })], layers);
    const hashes = [none, added, edited, decorative].map((d) => d.structureHash);
    expect(new Set(hashes).size).toBe(4);
    expect(added.hash).not.toBe(edited.hash);
  });

  it("changes the structure hash when the count of unanswered layers changes", () => {
    expect(base([], [layer("1", "a")]).structureHash).not.toBe(
      base([], [layer("1", "a"), layer("2", "b")]).structureHash
    );
  });
});

describe("applyAlt", () => {
  it("replaces the alt note, keeps other notes and records the source only when it is not the designer", () => {
    const other = { category: "name" as const, text: "Menu", updatedAt: AT };
    const first = applyAlt([other], { text: "A sign", decorative: false, source: "ai" }, AT);
    expect(first).toEqual([
      { category: "alt", text: "A sign", source: "ai", updatedAt: AT },
      other
    ]);
    const second = applyAlt(
      first,
      { text: "A bigger sign", decorative: false, source: "designer" },
      AT
    );
    expect(second[0]).toEqual({ category: "alt", text: "A bigger sign", updatedAt: AT });
  });
  it("makes a decorative mark with no text and no source, and clears on an empty answer", () => {
    const decorative = applyAlt([], { text: "x", decorative: true, source: "ai" }, AT);
    expect(decorative).toEqual([{ category: "alt", text: "", decorative: true, updatedAt: AT }]);
    expect(applyAlt(decorative, { text: " ", decorative: false, source: "designer" }, AT)).toEqual(
      []
    );
  });
});

describe("alt messages", () => {
  it("accepts the two requests and the reply, and refuses a bad source or a missing field", () => {
    expect(isAltUiMessage({ type: "HANDOFF_ALT_INVENTORY_REQUEST" })).toBe(true);
    const set = {
      type: "HANDOFF_ALT_SET",
      nodeId: "1:1",
      text: "x",
      decorative: false,
      source: "ai"
    };
    expect(isAltUiMessage(set)).toBe(true);
    expect(isAltUiMessage({ ...set, source: "model" })).toBe(false);
    expect(isAltUiMessage({ ...set, decorative: "no" })).toBe(false);
    expect(isAltUiMessage({ ...set, nodeId: 4 })).toBe(false);
    expect(isAltInventoryMessage({ type: "HANDOFF_ALT_INVENTORY", layers: [] })).toBe(true);
    expect(isAltInventoryMessage({ type: "HANDOFF_ALT_INVENTORY" })).toBe(false);
  });
});
