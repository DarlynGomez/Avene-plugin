import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { putEntry, type DraftEntry } from "../../../shared/handoff/draftCache";
import { buildTree } from "../../roles/testing/fakeFigma";
import { KEY_HANDOFF_DRAFTS } from "../handoffKeys";
import { loadDraftCache, saveDraftCache } from "./draftCacheStore";

const entry = (over: Partial<DraftEntry> = {}): DraftEntry => ({
  audience: "pm",
  blockId: "left",
  modelId: "m",
  structureHash: "abcd1234",
  sentences: ["Detected: {L1}"],
  generatedAt: "2026-10-28T10:00:00.000Z",
  ...over
});

beforeEach(() => void buildTree());
afterEach(() => vi.unstubAllGlobals());

describe("draft cache store", () => {
  it("round trips through the file", () => {
    expect(loadDraftCache()).toEqual({});
    const cache = putEntry({}, entry());
    const result = saveDraftCache(cache);
    expect(result).toMatchObject({ saved: true, cache });
    expect(loadDraftCache()).toEqual(cache);
  });

  it("drops entries that are not drafts", () => {
    figma.root.setPluginData(KEY_HANDOFF_DRAFTS, JSON.stringify({ a: { audience: "pm" } }));
    expect(loadDraftCache()).toEqual({});
  });

  it("refuses a cache over the size guard and keeps the old one", () => {
    const kept = putEntry({}, entry());
    saveDraftCache(kept);
    let huge = {};
    for (let i = 0; i < 40; i += 1) {
      huge = putEntry(huge, entry({ blockId: `block${i}`, sentences: ["x".repeat(2000)] }));
    }
    const result = saveDraftCache(huge);
    expect(result.saved).toBe(false);
    expect(result.cache).toEqual(kept);
    expect(loadDraftCache()).toEqual(kept);
  });
});
