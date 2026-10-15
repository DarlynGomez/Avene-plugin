import { describe, expect, it } from "vitest";

import { isPersistedDecisionFields } from "./decisionSchema";

const VALID = {
  reason: "Brand color, tracked for review",
  recordedAt: "2026-09-08T00:00:00.000Z",
  severityAtDecision: "high"
};

describe("isPersistedDecisionFields", () => {
  it("accepts a valid record", () => {
    expect(isPersistedDecisionFields(VALID)).toBe(true);
  });

  it("rejects a non-object", () => {
    expect(isPersistedDecisionFields(null)).toBe(false);
    expect(isPersistedDecisionFields("reason")).toBe(false);
  });

  it("rejects an empty or whitespace-only reason, the same invariant the state machine enforces", () => {
    expect(isPersistedDecisionFields({ ...VALID, reason: "" })).toBe(false);
    expect(isPersistedDecisionFields({ ...VALID, reason: "   " })).toBe(false);
  });

  it("rejects a missing or malformed recordedAt", () => {
    const withoutDate = { reason: VALID.reason, severityAtDecision: VALID.severityAtDecision };
    expect(isPersistedDecisionFields(withoutDate)).toBe(false);
    expect(isPersistedDecisionFields({ ...VALID, recordedAt: 12345 })).toBe(false);
  });

  it("rejects a severity outside the three known bands", () => {
    expect(isPersistedDecisionFields({ ...VALID, severityAtDecision: "critical" })).toBe(false);
  });
});
