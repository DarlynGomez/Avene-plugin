import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CachedSuggestion } from "../../../shared/handoff/alt/altSuggestCache";
import { fits } from "../../../shared/handoff/limits";
import { buildTree } from "../../roles/testing/fakeFigma";
import { KEY_ALT_SUGGEST } from "../handoffKeys";
import { loadSuggestions, saveSuggestions } from "./altSuggestStore";

const entry = (
  hash: string,
  text = "Order summary icon",
  at = "2026-11-05T10:00:00.000Z"
): CachedSuggestion => ({
  imageHash: hash,
  modelId: "vision:v1",
  style: "concise",
  kind: "describe",
  text,
  at
});
const root = () => figma.root as unknown as { getPluginData: (k: string) => string };

beforeEach(() => void buildTree());
afterEach(() => vi.unstubAllGlobals());

describe("the saved suggestions in the file", () => {
  it("are written on the file root under their own key and read back the same", () => {
    const result = saveSuggestions([entry("a"), entry("b", "A door")]);
    expect(result.saved).toBe(true);
    expect(loadSuggestions()).toEqual([entry("a"), entry("b", "A door")]);
    expect(root().getPluginData(KEY_ALT_SUGGEST)).toContain('"v":1');
    expect(KEY_ALT_SUGGEST).toBe("cadt.alt.suggest.v1");
  });

  it("are checked again on the way in, so a changed entry that no longer passes is left out", () => {
    Object.assign(figma.root, {
      getPluginData: () =>
        JSON.stringify({ v: 1, entries: [entry("a"), entry("b", "Image of a door")] })
    });
    expect(loadSuggestions().map((e) => e.imageHash)).toEqual(["a"]);
  });

  it("drop the oldest when there are too many for one entry and hand back what was kept", () => {
    const many = Array.from({ length: 700 }, (_, i) =>
      entry(
        `h${String(i).padStart(4, "0")}-${"x".repeat(40)}`,
        "w".repeat(120),
        `2026-11-05T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`
      )
    );
    const result = saveSuggestions(many);
    expect(result.saved).toBe(true);
    expect(result.entries.length).toBeLessThan(700);
    expect(fits(root().getPluginData(KEY_ALT_SUGGEST))).toBe(true);
    expect(result.entries[0].imageHash).toContain("h0699");
  });

  it("report a write that Figma refuses, and keep what was stored", () => {
    saveSuggestions([entry("a")]);
    const before = root().getPluginData(KEY_ALT_SUGGEST);
    Object.assign(figma.root, {
      setPluginData: () => {
        throw new Error("read only");
      }
    });
    const result = saveSuggestions([entry("a"), entry("b")]);
    expect(result).toMatchObject({ saved: false, error: "read only" });
    expect(result.entries.map((e) => e.imageHash)).toEqual(["a"]);
    expect(root().getPluginData(KEY_ALT_SUGGEST)).toBe(before);
  });

  it("clear the entry when there is nothing to keep", () => {
    saveSuggestions([entry("a")]);
    saveSuggestions([]);
    expect(root().getPluginData(KEY_ALT_SUGGEST)).toBe("");
  });
});
