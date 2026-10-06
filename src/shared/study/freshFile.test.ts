import { describe, expect, it } from "vitest";

import { checkFreshFile, type FreshFileInputs } from "./freshFile";

function inputs(patch: Partial<FreshFileInputs> = {}): FreshFileInputs {
  return { hasSession: false, decisionCount: 0, adjustLogCount: 0, issues: [], ...patch };
}

const CREATED = { state: "open", encounterCount: 0 } as const;

describe("checkFreshFile", () => {
  it("passes an empty file", () => {
    expect(checkFreshFile(inputs())).toEqual({ fresh: true });
  });

  it("passes a file holding only issues as the detector created them", () => {
    expect(checkFreshFile(inputs({ issues: [CREATED, CREATED, CREATED] }))).toEqual({
      fresh: true
    });
  });

  it("refuses a file with a session", () => {
    const result = checkFreshFile(inputs({ hasSession: true }));

    expect(result).toEqual({
      fresh: false,
      reason: "This file already has a study session. Use a fresh copy of the task file."
    });
  });

  it.each([
    ["deferred", { state: "deferred", encounterCount: 0 }],
    ["important", { state: "important", encounterCount: 0 }],
    ["ignored", { state: "ignored", encounterCount: 0 }],
    ["resolved", { state: "resolved", encounterCount: 0 }],
    ["open but met again", { state: "open", encounterCount: 1 }],
    ["open with a reason", { ...CREATED, ignoredReason: "brand" }],
    ["open with an ignore time", { ...CREATED, ignoredAt: "t" }],
    ["open and changed since ignore", { ...CREATED, changedSinceIgnore: true }]
  ] as const)("refuses an issue that is %s", (_name, issue) => {
    const result = checkFreshFile(inputs({ issues: [CREATED, issue] }));

    expect(result).toEqual({
      fresh: false,
      reason:
        "This file already has recorded responses to issues. Use a fresh copy of the task file."
    });
  });

  it("refuses a file with decisions", () => {
    const result = checkFreshFile(inputs({ decisionCount: 1 }));

    expect(result).toMatchObject({ fresh: false });
    expect(!result.fresh && result.reason).toContain("recorded decisions");
  });

  it("refuses a file with Adjust log entries", () => {
    const result = checkFreshFile(inputs({ adjustLogCount: 2 }));

    expect(!result.fresh && result.reason).toContain("Adjust log entries");
  });

  it("names the session first when several things are wrong", () => {
    const result = checkFreshFile(
      inputs({ hasSession: true, decisionCount: 3, adjustLogCount: 1 })
    );

    expect(!result.fresh && result.reason).toContain("study session");
  });

  it("ends every refusal with the fresh copy instruction", () => {
    for (const patch of [{ hasSession: true }, { decisionCount: 1 }, { adjustLogCount: 1 }]) {
      const result = checkFreshFile(inputs(patch));
      expect(!result.fresh && result.reason.endsWith("Use a fresh copy of the task file.")).toBe(
        true
      );
    }
  });
});
