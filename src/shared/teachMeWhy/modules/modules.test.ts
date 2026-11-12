import { describe, expect, it } from "vitest";

import { LEARNING_MODULES } from "./modules";

describe("the lessons", () => {
  it("are the twelve in order, each with a known category", () => {
    expect(LEARNING_MODULES.map((module) => module.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`)
    );
    for (const module of LEARNING_MODULES) {
      expect(["visual", "motor", "cognitive", "system"], module.id).toContain(module.category);
    }
  });

  it("have a YouTube video or none, and only M01, M06, M09 and M12 have one", () => {
    for (const module of LEARNING_MODULES) {
      if (module.video) expect(module.video.provider, module.id).toBe("youtube");
    }
    expect(LEARNING_MODULES.filter((module) => module.video !== null).map((m) => m.id)).toEqual([
      "M01",
      "M06",
      "M09",
      "M12"
    ]);
  });

  it("have an article only on M02", () => {
    expect(LEARNING_MODULES.filter((m) => m.optionalArticle !== null).map((m) => m.id)).toEqual([
      "M02"
    ]);
  });
});
