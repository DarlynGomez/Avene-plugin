import { describe, expect, it } from "vitest";

import type { Issue, IssueState } from "../../shared/issues/issueTypes";
import {
  createIssue,
  deferIssue,
  flagImportant,
  ignoreIssue,
  reconcileDetection,
  recordResurface,
  reopenIssue
} from "./stateMachine";

const NOW = "2026-09-08T00:00:00.000Z";
const LATER = "2026-09-09T00:00:00.000Z";

function issueIn(state: IssueState, overrides: Partial<Issue> = {}): Issue {
  return {
    id: "contrast:1:1",
    ruleId: "contrast",
    nodeId: "1:1",
    state,
    severityAtLastDetection: "medium",
    encounterCount: 0,
    lastDetectedAt: NOW,
    ...overrides
  };
}

describe("createIssue", () => {
  it("always starts open with zero encounters", () => {
    const issue = createIssue("contrast:1:1", "contrast", "1:1", "high", NOW);
    expect(issue).toEqual({
      id: "contrast:1:1",
      ruleId: "contrast",
      nodeId: "1:1",
      state: "open",
      severityAtLastDetection: "high",
      encounterCount: 0,
      lastDetectedAt: NOW
    });
  });
});

describe("deferIssue", () => {
  it.each<IssueState>(["open", "important"])("accepts from %s", (state) => {
    const result = deferIssue(issueIn(state));
    expect(result).toEqual({ ok: true, issue: issueIn(state, { state: "deferred" }) });
  });

  it.each<IssueState>(["deferred", "ignored", "resolved"])("rejects from %s", (state) => {
    expect(deferIssue(issueIn(state)).ok).toBe(false);
  });

  it("keeps the time it was put off when one is given, so its marker can fade", () => {
    const result = deferIssue(issueIn("open"), LATER);
    expect(result).toEqual({
      ok: true,
      issue: issueIn("open", { state: "deferred", deferredAt: LATER })
    });
  });

  it.each([
    ["flagged important", (issue: Issue) => flagImportant(issue)],
    ["reopened", (issue: Issue) => reopenIssue(issue)],
    ["ignored", (issue: Issue) => ignoreIssue(issue, "Brand color", LATER)]
  ])("forgets the time it was put off once it is %s", (_name, move) => {
    const result = move(issueIn("deferred", { deferredAt: NOW }));
    expect(result.ok).toBe(true);
    expect(result.ok && result.issue.deferredAt).toBeUndefined();
  });

  it("keeps the time through a fresh scan that finds it still failing", () => {
    const deferred = issueIn("deferred", { deferredAt: NOW });
    expect(reconcileDetection(deferred, "medium", LATER).deferredAt).toBe(NOW);
  });
});

describe("flagImportant", () => {
  it.each<IssueState>(["open", "deferred"])("accepts from %s", (state) => {
    const result = flagImportant(issueIn(state));
    expect(result).toEqual({ ok: true, issue: issueIn(state, { state: "important" }) });
  });

  it.each<IssueState>(["important", "ignored", "resolved"])("rejects from %s", (state) => {
    expect(flagImportant(issueIn(state)).ok).toBe(false);
  });
});

describe("ignoreIssue", () => {
  it.each<IssueState>(["open", "deferred", "important"])(
    "accepts from %s and stores the reason, timestamp, and severity at ignore",
    (state) => {
      const result = ignoreIssue(issueIn(state), "Client insisted on the brand color", LATER);
      expect(result).toEqual({
        ok: true,
        issue: issueIn(state, {
          state: "ignored",
          ignoredReason: "Client insisted on the brand color",
          ignoredAt: LATER,
          severityAtIgnore: "medium",
          changedSinceIgnore: false
        })
      });
    }
  );

  it.each<IssueState>(["ignored", "resolved"])("rejects from %s", (state) => {
    expect(ignoreIssue(issueIn(state), "reason", LATER).ok).toBe(false);
  });

  it("rejects an empty reason, so the invariant cannot be bypassed by a malformed message", () => {
    const result = ignoreIssue(issueIn("open"), "   ", LATER);
    expect(result).toEqual({ ok: false, reason: "A reason is required to ignore an issue" });
  });
});

describe("reopenIssue", () => {
  it.each<IssueState>(["deferred", "important", "ignored"])("accepts from %s", (state) => {
    const result = reopenIssue(issueIn(state));
    expect(result).toEqual({ ok: true, issue: issueIn(state, { state: "open" }) });
  });

  it.each<IssueState>(["open", "resolved"])("rejects from %s", (state) => {
    expect(reopenIssue(issueIn(state)).ok).toBe(false);
  });
});

describe("recordResurface", () => {
  it("increments encounterCount and changes nothing else", () => {
    const issue = issueIn("deferred", { encounterCount: 2 });
    expect(recordResurface(issue)).toEqual({ ...issue, encounterCount: 3 });
  });
});

describe("reconcileDetection", () => {
  it.each<IssueState>(["open", "deferred", "important"])(
    "leaves %s in place, refreshing severity and timestamp",
    (state) => {
      const issue = issueIn(state, { severityAtLastDetection: "low" });
      const result = reconcileDetection(issue, "high", LATER);
      expect(result).toEqual({ ...issue, severityAtLastDetection: "high", lastDetectedAt: LATER });
    }
  );

  it("moves to resolved when the finding stops being produced, never auto-closing to any other state", () => {
    const issue = issueIn("deferred");
    expect(reconcileDetection(issue, null, LATER)).toEqual({ ...issue, state: "resolved" });
  });

  it("is a no-op when an already-resolved issue still produces no finding", () => {
    const issue = issueIn("resolved");
    expect(reconcileDetection(issue, null, LATER)).toEqual(issue);
  });

  it("reopens from resolved when the finding reappears, preserving the record", () => {
    const issue = issueIn("resolved", { encounterCount: 4 });
    const result = reconcileDetection(issue, "medium", LATER);
    expect(result).toEqual({
      ...issue,
      state: "open",
      severityAtLastDetection: "medium",
      lastDetectedAt: LATER
    });
  });

  it("leaves an ignored issue standing when the new severity is the same band", () => {
    const issue = issueIn("ignored", {
      severityAtIgnore: "medium",
      changedSinceIgnore: false
    });
    const result = reconcileDetection(issue, "medium", LATER);
    expect(result.state).toBe("ignored");
    expect(result.changedSinceIgnore).toBe(false);
  });

  it("leaves an ignored issue standing when the new severity is better", () => {
    const issue = issueIn("ignored", { severityAtIgnore: "high" });
    const result = reconcileDetection(issue, "low", LATER);
    expect(result.state).toBe("ignored");
  });

  it("reopens an ignored issue once, marked changed, when the new severity is worse", () => {
    const issue = issueIn("ignored", { severityAtIgnore: "low" });
    const result = reconcileDetection(issue, "high", LATER);
    expect(result.state).toBe("open");
    expect(result.changedSinceIgnore).toBe(true);
    expect(result.severityAtLastDetection).toBe("high");
  });
});
