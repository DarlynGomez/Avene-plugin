import { describe, expect, it } from "vitest";

import { fits } from "../limits";
import {
  cacheKey,
  cleanSuggestions,
  fitSuggestions,
  parseSuggestCache,
  pickSuggestion,
  putSuggestion,
  serializeSuggestCache,
  type CachedSuggestion
} from "./altSuggestCache";
import { outcomeOf, outcomeOfReply, readAltReply } from "./altSuggestion";

const at = (n: number) => `2026-11-05T10:${String(n % 60).padStart(2, "0")}:00.000Z`;
const entry = (hash: string, over: Partial<CachedSuggestion> = {}): CachedSuggestion => ({
  imageHash: hash,
  modelId: "vision:v1",
  kind: "describe",
  text: "Order summary icon that opens the cart",
  at: at(1),
  ...over
});

describe("readAltReply", () => {
  it("reads a good reply and turns anything else into a failure with a reason", () => {
    expect(
      readAltReply({ kind: "describe", text: "A sign", reason: "ok", model: "m", ms: 5 })
    ).toEqual({
      kind: "describe",
      text: "A sign",
      reason: "ok",
      model: "m",
      ms: 5
    });
    expect(readAltReply(null).reason).toBe("malformed");
    expect(readAltReply({ kind: "poem", reason: "ok", text: "x" })).toMatchObject({
      kind: "unsure",
      text: ""
    });
    expect(readAltReply({ kind: "describe", text: "x", reason: "timeout" })).toMatchObject({
      kind: "unsure",
      text: "",
      reason: "timeout"
    });
  });
});

describe("outcomeOf", () => {
  it("shows a description that passes, trimmed, with any warnings", () => {
    expect(outcomeOf("describe", "  A sign  ", "Hero")).toEqual({
      status: "describe",
      text: "A sign",
      warnings: []
    });
    expect(outcomeOf("describe", "a".repeat(130), "Hero")).toMatchObject({
      status: "describe",
      warnings: ["too-long"]
    });
  });

  it("drops a rejected description and carries none of its words", () => {
    const out = outcomeOf("describe", "Image of a secret cafe", "Hero");
    expect(out).toEqual({ status: "none", reason: "rejected" });
    expect(JSON.stringify(out)).not.toContain("secret");
  });

  it("keeps decorative as a thing the designer decides, and unsure as nothing", () => {
    expect(outcomeOf("decorative", "", "Hero")).toEqual({ status: "decorative" });
    expect(outcomeOf("unsure", "", "Hero")).toEqual({ status: "none", reason: "unsure" });
  });

  it("makes a failure reply into nothing, with the reason", () => {
    expect(outcomeOfReply(readAltReply({ reason: "timeout" }), "Hero")).toEqual({
      status: "none",
      reason: "timeout"
    });
  });
});

describe("the saved suggestions", () => {
  it("round trip through the stored text", () => {
    const list = [entry("a"), entry("b", { kind: "decorative", text: "" })];
    expect(parseSuggestCache(serializeSuggestCache(list))).toEqual(list);
  });

  it("are checked again as they are read, and one that no longer passes is left out", () => {
    const stored = JSON.stringify({
      v: 1,
      entries: [
        entry("a"),
        entry("b", { text: "Image of a table" }),
        entry("c", { text: "" }),
        { imageHash: "d" },
        4
      ]
    });
    expect(parseSuggestCache(stored).map((e) => e.imageHash)).toEqual(["a"]);
  });

  it("read as nothing when the text is not theirs", () => {
    expect(parseSuggestCache("")).toEqual([]);
    expect(parseSuggestCache("not json")).toEqual([]);
    expect(parseSuggestCache(JSON.stringify({ v: 2, entries: [entry("a")] }))).toEqual([]);
  });

  it("keep one for each picture and model, the newest put in replacing the older", () => {
    const next = putSuggestion([entry("a")], entry("a", { text: "A newer sentence", at: at(9) }));
    expect(next).toHaveLength(1);
    expect(next[0].text).toBe("A newer sentence");
    expect(putSuggestion(next, entry("a", { modelId: "vision:v2" }))).toHaveLength(2);
    expect(cleanSuggestions([entry("a"), entry("a")])).toHaveLength(1);
    expect(cacheKey("a", "m")).toBe("a|m");
  });

  it("are found by picture, and by model when the model is known, the newest first otherwise", () => {
    const list = [
      entry("a", { modelId: "v1", text: "Old words", at: at(1) }),
      entry("a", { modelId: "v2", text: "New words", at: at(5) })
    ];
    expect(pickSuggestion(list, "a", null)?.text).toBe("New words");
    expect(pickSuggestion(list, "a", "v1")?.text).toBe("Old words");
    expect(pickSuggestion(list, "a", "v3")).toBeNull();
    expect(pickSuggestion(list, "zzz", null)).toBeNull();
  });

  it("fit in one plugin data entry by dropping the oldest, so the newest are the ones kept", () => {
    const many = Array.from({ length: 600 }, (_, i) =>
      entry(`hash-${String(i).padStart(4, "0")}-${"x".repeat(40)}`, {
        text: "w".repeat(120),
        at: `2026-11-05T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`
      })
    );
    const kept = fitSuggestions(many);
    expect(kept.length).toBeGreaterThan(50);
    expect(kept.length).toBeLessThan(600);
    expect(fits(serializeSuggestCache(many))).toBe(true);
    expect(kept[0].imageHash).toContain("hash-0599");
    expect(kept.some((e) => e.imageHash.includes("hash-0000"))).toBe(false);
  });

  it("write nothing for an empty list, so the entry can be cleared", () => {
    expect(serializeSuggestCache([])).toBe("");
  });
});
