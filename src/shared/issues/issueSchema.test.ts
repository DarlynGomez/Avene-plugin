import { describe, expect, it } from "vitest";

import { isIssue, isPersistedIssueFields } from "./issueSchema";
import type { Issue } from "./issueTypes";

const VALID: Issue = {
  id: "contrast:1:1",
  ruleId: "contrast",
  nodeId: "1:1",
  state: "open",
  severityAtLastDetection: "medium",
  encounterCount: 0,
  lastDetectedAt: "2026-09-08T00:00:00.000Z"
};

describe("isIssue", () => {
  it("accepts a minimal valid issue", () => {
    expect(isIssue(VALID)).toBe(true);
  });

  it("accepts a valid issue with every optional field present", () => {
    expect(
      isIssue({
        ...VALID,
        state: "ignored",
        ignoredReason: "Client insisted",
        ignoredAt: "2026-09-08T00:00:00.000Z",
        severityAtIgnore: "medium",
        changedSinceIgnore: false
      })
    ).toBe(true);
  });

  it("accepts a deferral time as text and rejects anything else", () => {
    expect(isIssue({ ...VALID, state: "deferred", deferredAt: "2026-11-13T10:00:00.000Z" })).toBe(
      true
    );
    expect(isIssue({ ...VALID, state: "deferred", deferredAt: 5 })).toBe(false);
  });

  it.each(["id", "ruleId", "nodeId", "lastDetectedAt"])("rejects a missing %s", (field) => {
    const withMissingField = Object.fromEntries(
      Object.entries(VALID).filter(([key]) => key !== field)
    );
    expect(isIssue(withMissingField)).toBe(false);
  });

  it("rejects an invalid state", () => {
    expect(isIssue({ ...VALID, state: "closed" })).toBe(false);
  });

  it("rejects an invalid severity", () => {
    expect(isIssue({ ...VALID, severityAtLastDetection: "critical" })).toBe(false);
  });

  it("rejects a non-number encounterCount", () => {
    expect(isIssue({ ...VALID, encounterCount: "3" })).toBe(false);
  });

  it("rejects an invalid severityAtIgnore", () => {
    expect(isIssue({ ...VALID, severityAtIgnore: "critical" })).toBe(false);
  });

  it("rejects a non-boolean changedSinceIgnore", () => {
    expect(isIssue({ ...VALID, changedSinceIgnore: "yes" })).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isIssue(null)).toBe(false);
    expect(isIssue("issue")).toBe(false);
    expect(isIssue(42)).toBe(false);
  });
});

describe("isPersistedIssueFields", () => {
  const OMITTED_KEYS = new Set(["id", "ruleId", "nodeId"]);
  const PERSISTED = Object.fromEntries(
    Object.entries(VALID).filter(([key]) => !OMITTED_KEYS.has(key))
  );

  it("accepts the minimal persisted shape, with no id, ruleId, or nodeId", () => {
    expect(isPersistedIssueFields(PERSISTED)).toBe(true);
    expect("id" in PERSISTED).toBe(false);
  });

  it("rejects an invalid state", () => {
    expect(isPersistedIssueFields({ ...PERSISTED, state: "closed" })).toBe(false);
  });

  it("rejects null and non-objects", () => {
    expect(isPersistedIssueFields(null)).toBe(false);
    expect(isPersistedIssueFields("issue")).toBe(false);
  });
});
