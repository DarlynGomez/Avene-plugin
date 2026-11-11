import { describe, expect, it } from "vitest";

import { LEARNING_MODULES } from "./modules";

describe("the lessons", () => {
  it("are the eleven in order, each with a known category", () => {
    expect(LEARNING_MODULES.map((module) => module.id)).toEqual(
      Array.from({ length: 11 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`)
    );
    for (const module of LEARNING_MODULES) {
      expect(["visual", "motor", "cognitive", "system"], module.id).toContain(module.category);
    }
  });

  it("have a YouTube video or none, and the one with none is the alt text lesson", () => {
    for (const module of LEARNING_MODULES) {
      if (module.video) expect(module.video.provider, module.id).toBe("youtube");
    }
    expect(LEARNING_MODULES.filter((module) => module.video === null).map((m) => m.id)).toEqual([
      "M11"
    ]);
  });
});
