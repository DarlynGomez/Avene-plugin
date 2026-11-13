import { describe, expect, it } from "vitest";

import { BUILD_INFO } from "./buildInfo";

describe("the build info", () => {
  it("says it is the study build when nothing set the stamp, so a plain run is the study build", () => {
    expect(BUILD_INFO.studyBuild).toBe(true);
    expect(BUILD_INFO).toEqual({
      commit: "unknown",
      dirty: null,
      builtAt: "unknown",
      studyBuild: true
    });
  });
});
