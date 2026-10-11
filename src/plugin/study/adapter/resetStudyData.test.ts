import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  STORAGE_KEY_ADJUST_LOG,
  STORAGE_KEY_DECISIONS,
  STORAGE_KEY_ISSUES,
  STORAGE_KEY_PROFILE,
  STORAGE_KEY_STUDY_SESSION
} from "../../storage/storageKeys";
import { resetStudyData } from "./resetStudyData";

let setPluginData: ReturnType<typeof vi.fn>;

beforeEach(() => {
  setPluginData = vi.fn();
  vi.stubGlobal("figma", { root: { setPluginData } });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resetStudyData", () => {
  it("empties the session, issues, decisions and Adjust log", () => {
    const result = resetStudyData();

    for (const key of [
      STORAGE_KEY_STUDY_SESSION,
      STORAGE_KEY_ISSUES,
      STORAGE_KEY_DECISIONS,
      STORAGE_KEY_ADJUST_LOG
    ]) {
      expect(setPluginData).toHaveBeenCalledWith(key, "");
    }
    expect(result.failed).toEqual([]);
    expect(result.cleared).toHaveLength(4);
  });

  it("leaves calibration alone", () => {
    resetStudyData();

    expect(setPluginData).not.toHaveBeenCalledWith(STORAGE_KEY_PROFILE, expect.anything());
  });

  it("reports a failing key and still clears the rest", () => {
    setPluginData.mockImplementationOnce(() => {
      throw new Error("read only");
    });
    const result = resetStudyData();

    expect(result.failed).toEqual([{ key: STORAGE_KEY_STUDY_SESSION, reason: "read only" }]);
    expect(result.cleared).toHaveLength(3);
  });
});
