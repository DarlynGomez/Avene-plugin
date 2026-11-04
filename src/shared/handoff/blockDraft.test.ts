import { describe, expect, it } from "vitest";

import { checkDraft, offerFor } from "./blockDraft";
import { putEntry, type DraftEntry } from "./draftCache";
import { docFor, reword, sectionOf } from "./draftFixtures";
import { renderLines } from "./render";

const doc = docFor("developer");
const block = sectionOf(doc, "action");
const entry = (over: Partial<DraftEntry> = {}): DraftEntry => ({
  audience: "developer",
  blockId: "action",
  modelId: "text-model:test",
  structureHash: doc.structureHash,
  sentences: reword(block.lines),
  generatedAt: "2026-10-28T10:00:00.000Z",
  ...over
});

describe("checkDraft", () => {
  it("passes a rewrite and puts the values back, the same way every time", () => {
    const checked = checkDraft(reword(block.lines), block, doc.slots);
    expect(checked.ok).toBe(true);
    if (checked.ok) {
      expect(checked.filled[0]).toContain("Helper text");
      expect(checked.filled[0]).toContain("It is not bound");
      expect(checked.filled).toEqual(renderLines(checked.sentences, doc.slots, "developer"));
    }
  });

  it("rejects what the verifier rejects", () => {
    const bad = [block.lines[0].replace("Detected:", "Decision:")];
    const checked = checkDraft(bad, block, doc.slots);
    expect(checked.ok).toBe(false);
    expect(checkDraft("text", block, doc.slots).ok).toBe(false);
  });
});

describe("offerFor", () => {
  it("offers a current draft that passes again, live or from the cache alike", () => {
    const offer = offerFor(entry(), block, doc);
    expect(offer.state).toBe("ready");
    const cached = offerFor(
      putEntry({}, entry())[Object.keys(putEntry({}, entry()))[0]],
      block,
      doc
    );
    expect(cached).toEqual(offer);
  });

  it("offers nothing when there is no draft", () => {
    expect(offerFor(null, block, doc)).toEqual({ state: "none" });
  });

  it("calls a draft stale when the findings it was made from have changed, and does not offer it", () => {
    expect(offerFor(entry({ structureHash: "00000000" }), block, doc)).toEqual({ state: "stale" });
    const moved = docFor("developer", { generatedAt: doc.header[1] });
    expect(moved.structureHash).toBe(doc.structureHash);
  });

  it("rejects a saved draft that no longer passes the checks", () => {
    const tampered = entry({ sentences: [block.lines[0] + " It is compliant."] });
    expect(offerFor(tampered, block, doc)).toEqual({ state: "rejected" });
    const unknownId = entry({ sentences: [block.lines[0] + " {zz9}"] });
    expect(offerFor(unknownId, block, doc)).toEqual({ state: "rejected" });
  });
});
