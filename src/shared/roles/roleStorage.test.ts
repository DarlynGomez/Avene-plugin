import { describe, expect, it } from "vitest";
import {
  alreadyAsked,
  inputKeyOf,
  parseRoleData,
  shownSuggestion,
  type RoleData
} from "./roleStorage";
import { layer } from "./testing/fixtures";

const suggestion = {
  label: "caption",
  source: "ai",
  model: "m",
  reviewed: true,
  live: false,
  inputKey: "k",
  at: "t"
};
const raw = (value: unknown) => JSON.stringify(value);

describe("parseRoleData", () => {
  it("reads a value of version 1, keeping a suggestion and an answer", () => {
    const data = parseRoleData(
      raw({ v: 1, suggestion, answer: { role: "label", response: "changed", from: "ai", at: "t" } })
    );
    expect(data?.suggestion).toMatchObject({
      label: "caption",
      reviewed: true,
      live: false,
      model: "m"
    });
    expect(data?.answer).toEqual({ role: "label", response: "changed", from: "ai", at: "t" });
  });
  it("reads another version, bad JSON and no value as absent, never migrating", () => {
    expect(parseRoleData(raw({ v: 2, answer: { role: "label", response: "changed" } }))).toBeNull();
    expect(parseRoleData("{oops")).toBeNull();
    expect(parseRoleData("")).toBeNull();
    expect(parseRoleData(raw([1]))).toBeNull();
  });
  it("drops a part that is not valid and keeps the rest", () => {
    const data = parseRoleData(
      raw({
        v: 1,
        suggestion: { ...suggestion, label: "banner" },
        answer: { role: "label", response: "changed" }
      })
    );
    expect(data?.suggestion).toBeUndefined();
    expect(data?.answer?.role).toBe("label");
    expect(
      parseRoleData(raw({ v: 1, answer: { role: "label", response: "maybe" } }))?.answer
    ).toBeUndefined();
    expect(
      parseRoleData(
        raw({ v: 1, answer: { role: "label", response: "changed", from: "elsewhere" } })
      )?.answer?.from
    ).toBe("none");
  });
});

describe("the input key", () => {
  it("is size, weight, character count and layer name, and ignores colour", () => {
    const price = layer("A1.card1.price");
    expect(inputKeyOf(price)).toBe("16|600|5|price");
    expect(inputKeyOf({ ...price, parentHasSolidFill: false, ancestorNames: [] })).toBe(
      "16|600|5|price"
    );
    expect(inputKeyOf({ ...price, fontSizePx: 18 })).not.toBe(inputKeyOf(price));
  });
});

describe("what may be shown", () => {
  const data = (patch: Record<string, unknown>): RoleData => ({
    v: 1,
    suggestion: { ...suggestion, ...patch } as never
  });
  it("shows a reviewed or live suggestion that still matches and says something", () => {
    expect(shownSuggestion(data({}), "k")?.label).toBe("caption");
    expect(shownSuggestion(data({ reviewed: false, live: true }), "k")?.label).toBe("caption");
  });
  it("shows nothing for an unreviewed precomputed one, a stale one, an unsure one, or none", () => {
    expect(shownSuggestion(data({ reviewed: false }), "k")).toBeNull();
    expect(shownSuggestion(data({}), "other")).toBeNull();
    expect(shownSuggestion(data({ label: "unsure" }), "k")).toBeNull();
    expect(shownSuggestion(null, "k")).toBeNull();
  });
  it("counts as asked whatever the model said, while the layer is as it was", () => {
    expect(alreadyAsked(data({ label: "unsure", reviewed: false }), "k")).toBe(true);
    expect(alreadyAsked(data({}), "other")).toBe(false);
    expect(alreadyAsked(null, "k")).toBe(false);
  });
});
