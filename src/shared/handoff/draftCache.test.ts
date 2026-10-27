import { describe, expect, it } from "vitest";

import {
  cacheKey,
  cleanCache,
  newestEntry,
  parseCache,
  putEntry,
  serializeCache,
  type DraftEntry
} from "./draftCache";
import { ENTRY_VALUE_MAX_BYTES, utf8Length } from "./limits";

const entry = (over: Partial<DraftEntry> = {}): DraftEntry => ({
  audience: "pm",
  blockId: "left",
  modelId: "text-model:test",
  structureHash: "abcd1234",
  sentences: ["Detected: {L1} on {S1}"],
  generatedAt: "2026-10-28T10:00:00.000Z",
  ...over
});

describe("draft cache", () => {
  it("round trips and keys by audience, block and model", () => {
    const cache = putEntry({}, entry());
    expect(Object.keys(cache)).toEqual([cacheKey("pm", "left", "text-model:test")]);
    expect(parseCache(serializeCache(cache))).toEqual(cache);
  });

  it("rebuilds keys from the entries so a key can never disagree with its entry", () => {
    const cleaned = cleanCache({
      wrong: entry(),
      junk: { audience: "pm" },
      text: "x",
      nothing: null
    });
    expect(Object.keys(cleaned)).toEqual([cacheKey("pm", "left", "text-model:test")]);
  });

  it.each([
    ["an unknown reader", { audience: "boss" }],
    ["no sentences", { sentences: [] }],
    ["a blank sentence", { sentences: ["  "] }],
    ["no hash", { structureHash: "" }],
    ["a number as a sentence", { sentences: [4] }]
  ])("drops an entry with %s", (_name, bad) => {
    expect(cleanCache({ a: { ...entry(), ...bad } })).toEqual({});
  });

  it("gives an empty cache for empty or broken data", () => {
    expect(parseCache("")).toEqual({});
    expect(parseCache("{nope")).toEqual({});
    expect(parseCache("[1]")).toEqual({});
    expect(serializeCache({})).toBe("");
  });

  it("finds the newest draft for a block whatever model made it", () => {
    const older = entry({ modelId: "a", generatedAt: "2026-10-27T10:00:00.000Z" });
    const newer = entry({ modelId: "b", generatedAt: "2026-10-28T10:00:00.000Z" });
    const cache = putEntry(putEntry({}, older), newer);
    expect(newestEntry(cache, "pm", "left")?.modelId).toBe("b");
    expect(newestEntry(cache, "client", "left")).toBeNull();
    expect(newestEntry(cache, "pm", "action")).toBeNull();
  });

  it("keeps a full set of drafts for every reader well under the size guard", () => {
    let cache = {};
    const sentence =
      "Detected: The text {L1} on {S1} measures {r1}:1 and needs {q1}:1 ({sc}). {c1} layers share the pair. Bound to {b1}.";
    for (const audience of ["developer", "pm", "higherUp", "client"] as const) {
      for (const block of [
        "summary",
        "action",
        "left",
        "changes",
        "notes",
        "questions",
        "advisory"
      ]) {
        cache = putEntry(
          cache,
          entry({ audience, blockId: block, sentences: Array(6).fill(sentence) })
        );
      }
    }
    expect(utf8Length(serializeCache(cache))).toBeLessThan(ENTRY_VALUE_MAX_BYTES / 2);
  });
});
