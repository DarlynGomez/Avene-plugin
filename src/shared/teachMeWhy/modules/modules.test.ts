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

  it("have a YouTube video or none, and only M01, M06 and M12 have one now that M09 lost its video", () => {
    for (const module of LEARNING_MODULES) {
      if (module.video) expect(module.video.provider, module.id).toBe("youtube");
    }
    expect(LEARNING_MODULES.filter((module) => module.video !== null).map((m) => m.id)).toEqual([
      "M01",
      "M06",
      "M12"
    ]);
  });

  it("have an article on every lesson but M05, M07, M08 and M10", () => {
    expect(LEARNING_MODULES.filter((m) => m.optionalArticle !== null).map((m) => m.id)).toEqual([
      "M01",
      "M02",
      "M03",
      "M04",
      "M06",
      "M09",
      "M11",
      "M12"
    ]);
  });
});
