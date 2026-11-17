import { describe, expect, it } from "vitest";

import { moduleForKey } from "../moduleForKey";
import { LEARNING_MODULES } from "./modules";
import { libraryModules, STUDY_LIBRARY_MODULES } from "./studyLibrary";

describe("the lessons on offer", () => {
  it("are the study set in the study build and every lesson otherwise, in order", () => {
    expect(libraryModules(LEARNING_MODULES, true).map((m) => m.id)).toEqual([
      ...STUDY_LIBRARY_MODULES
    ]);
    expect(libraryModules(LEARNING_MODULES, false)).toHaveLength(12);
  });

  it("include every lesson the deep dive arrow can open", () => {
    const keys = ["unknown", "decorative", "body"].flatMap((role) =>
      (["normal", "large"] as const).map((size) => ({ role, size }))
    );
    for (const key of keys) {
      expect(STUDY_LIBRARY_MODULES).toContain(
        moduleForKey(key as Parameters<typeof moduleForKey>[0])
      );
    }
  });
});
