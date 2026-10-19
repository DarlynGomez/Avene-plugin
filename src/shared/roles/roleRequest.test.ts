import { afterEach, describe, expect, it } from "vitest";
import { ROLE_SERVER } from "./roleConfig";
import { chooseCrop, exportScaleFor, readReply, serverInputs } from "./roleRequest";
import { layer } from "./testing/fixtures";

const config = ROLE_SERVER as { cropContext: string };
afterEach(() => {
  config.cropContext = "node";
});

describe("exportScaleFor", () => {
  it("is 1 for text that is already 14 pixels or more", () => {
    expect(exportScaleFor(14, 100, 20)).toBe(1);
    expect(exportScaleFor(28, 400, 40)).toBe(1);
  });
  it("rounds up to a half step so font size times scale is at least 14", () => {
    expect(exportScaleFor(12, 100, 20)).toBe(1.5);
    expect(exportScaleFor(10, 100, 20)).toBe(1.5);
    expect(exportScaleFor(7, 100, 20)).toBe(2);
    expect(exportScaleFor(9, 100, 20)).toBe(2);
    for (const size of [6, 7, 8, 9, 10, 11, 12, 13, 13.5]) {
      expect((exportScaleFor(size, 100, 20) ?? 0) * size).toBeGreaterThanOrEqual(14);
    }
  });
  it("is held under the image cap when the text stays legible, and null when it would not", () => {
    expect(exportScaleFor(28, 2000, 100)).toBeCloseTo(1024 / 2000, 5);
    expect(exportScaleFor(20, 2000, 100)).toBeNull();
    expect(exportScaleFor(14, 1024, 100)).toBe(1);
    expect(exportScaleFor(14, 1025, 100)).toBeNull();
  });
  it("is null with no size, a mixed size, or no area", () => {
    expect(exportScaleFor(null, 100, 20)).toBeNull();
    expect(exportScaleFor(0, 100, 20)).toBeNull();
    expect(exportScaleFor(14, 0, 20)).toBeNull();
  });
});

describe("chooseCrop", () => {
  it("is the text alone by default, whatever the parent", () => {
    expect(chooseCrop({ longestSide: 100 })).toBe("node");
    expect(chooseCrop(null)).toBe("node");
  });
  it("is the parent only when the setting says so and the parent is small, 400 pixels at most", () => {
    config.cropContext = "parent";
    expect(chooseCrop({ longestSide: 400 })).toBe("parent");
    expect(chooseCrop({ longestSide: 401 })).toBe("node");
    expect(chooseCrop(null)).toBe("node");
  });
});

describe("serverInputs", () => {
  it("is four numbers and nothing else, no names and no words", () => {
    const inputs = serverInputs(layer("A1.card1.price"));
    expect(Object.keys(inputs).sort()).toEqual([
      "centerYFraction",
      "fontWeight",
      "sizeRatio",
      "wordCount"
    ]);
    expect(inputs.sizeRatio).toBeCloseTo(16 / 14, 5);
    expect(inputs.wordCount).toBe(1);
  });
  it("has no size ratio when the screen has too little text to compare with", () => {
    expect(serverInputs({ ...layer("A1.card1.price"), screenTextCensus: [] }).sizeRatio).toBeNull();
  });
});

describe("readReply", () => {
  it("reads a good reply", () => {
    expect(readReply({ label: "caption", reason: "ok", model: "m", ms: 12 })).toEqual({
      label: "caption",
      reason: "ok",
      model: "m",
      ms: 12
    });
  });
  it("turns anything else into unsure, so a bad reply can never become a label", () => {
    for (const bad of [null, "caption", 5, {}, { label: "banner" }, { label: 3 }]) {
      expect(readReply(bad)).toMatchObject({ label: "unsure", reason: "malformed" });
    }
  });
});
