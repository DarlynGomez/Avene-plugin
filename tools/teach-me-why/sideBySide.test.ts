import { describe, expect, it } from "vitest";
import { sideBySide, wrap } from "./sideBySide";
import { taskKeys } from "./taskKeys";

describe("wrap", () => {
  it("breaks on word boundaries and never splits a word", () => {
    expect(wrap("one two three four", 9)).toEqual(["one two", "three", "four"]);
    expect(wrap("", 10)).toEqual([""]);
  });
});

describe("sideBySide", () => {
  it("lines two texts up in two columns, padding the shorter", () => {
    expect(sideBySide("a b c d", "x", 3)).toEqual(["a b | x", "c d | "]);
  });
});

describe("taskKeys", () => {
  it("pairs each key with its unknown role counterpart for eight keys and 24 rows", () => {
    const text = [
      "caption:high:normal:1",
      "caption:high:normal:2",
      "caption:high:normal:3",
      "decorative:high:large:1",
      "decorative:high:large:2",
      "decorative:high:large:3",
      "heading:low:large:1",
      "heading:low:large:2",
      "heading:low:large:3",
      "button text:medium:normal:1",
      "button text:medium:normal:2",
      "button text:medium:normal:3",
      ""
    ].join("\n");
    const keys = taskKeys(text);
    expect(keys).toHaveLength(24);
    const bare = new Set(keys.map((k) => `${k.role}:${k.severity}:${k.size}`));
    expect(bare.size).toBe(8);
    expect([...bare].filter((k) => k.startsWith("unknown:")).sort()).toEqual([
      "unknown:high:large",
      "unknown:high:normal",
      "unknown:low:large",
      "unknown:medium:normal"
    ]);
  });
});
