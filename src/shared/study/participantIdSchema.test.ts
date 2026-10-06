import { describe, expect, it } from "vitest";

import { participantIdError, validateStartForm } from "./participantIdSchema";

const VALID = {
  participantId: "P-07_a",
  block: 1,
  task: "A",
  condition: "live",
  paperConsentSigned: true
};

describe("participantIdError", () => {
  it.each(["P01", "a", "P-07", "p_07", "X".repeat(32), "0123456789"])("accepts %s", (id) => {
    expect(participantIdError(id)).toBeNull();
  });

  it.each([
    ["", "empty"],
    [undefined, "missing"],
    [null, "null"],
    [7, "a number"],
    ["P 01", "a space"],
    [" P01", "a leading space"],
    ["P01 ", "a trailing space"],
    ["P/01", "a slash"],
    ["P.01", "a dot"],
    ["Pé01", "an accented letter"],
    ["P01\n", "a newline"],
    ["X".repeat(33), "too long"]
  ])("refuses %j (%s)", (...[id]) => {
    expect(participantIdError(id)).not.toBeNull();
  });

  it("says why an empty id is refused", () => {
    expect(participantIdError("")).toBe("Enter a participant ID");
  });
});

describe("validateStartForm", () => {
  it("accepts a complete form and returns only the block fields", () => {
    expect(validateStartForm(VALID)).toEqual({
      ok: true,
      value: { participantId: "P-07_a", block: 1, task: "A", condition: "live" }
    });
  });

  it("accepts block 2, task B and post-task", () => {
    const result = validateStartForm({ ...VALID, block: 2, task: "B", condition: "post-task" });

    expect(result).toMatchObject({
      ok: true,
      value: { block: 2, task: "B", condition: "post-task" }
    });
  });

  it("refuses an empty form and reports every field", () => {
    const result = validateStartForm({});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["block", "condition", "paperConsentSigned", "participantId", "task"].sort()
      );
    }
  });

  it.each([
    ["block", { block: 3 }],
    ["block", { block: "1" }],
    ["block", { block: 0 }],
    ["task", { task: "C" }],
    ["task", { task: "a" }],
    ["condition", { condition: "Live" }],
    ["condition", { condition: "post" }],
    ["participantId", { participantId: "bad id" }]
  ] as const)("refuses a malformed %s", (field, patch) => {
    const result = validateStartForm({ ...VALID, ...patch });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field]).toBeDefined();
  });

  it.each([false, undefined, "true", 1])(
    "requires paper consent to be exactly true, not %j",
    (value) => {
      const result = validateStartForm({ ...VALID, paperConsentSigned: value });

      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.errors.paperConsentSigned).toBe("Confirm that paper consent was signed");
    }
  );

  it("reports only the fields that are wrong", () => {
    const result = validateStartForm({ ...VALID, task: "Z" });

    expect(result).toEqual({ ok: false, errors: { task: "Choose task A or B" } });
  });
});
