import { describe, expect, it } from "vitest";

import type { Issue, IssueState } from "../../shared/issues/issueTypes";
import type { IssueRecordMap } from "./issueStore";
import {
  deferRoot,
  ignoreRoot,
  markRootImportant,
  reopenRoot,
  unmarkRootImportant
} from "./groupActions";

const NOW = "2026-09-08T00:00:00.000Z";

function issueIn(id: string, state: IssueState, overrides: Partial<Issue> = {}): Issue {
  return {
    id,
    ruleId: "contrast",
    nodeId: id,
    state,
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: NOW,
    ...overrides
  };
}

function recordOf(...issues: Issue[]): IssueRecordMap {
  return Object.fromEntries(issues.map((issue) => [issue.id, issue]));
}

describe("deferRoot", () => {
  it("defers every open instance and leaves the rest untouched", () => {
    const record = recordOf(
      issueIn("a", "open"),
      issueIn("b", "open"),
      issueIn("c", "important"),
      issueIn("d", "ignored")
    );

    const result = deferRoot(record, ["a", "b", "c", "d"]);

    expect(result.record.a.state).toBe("deferred");
    expect(result.record.b.state).toBe("deferred");
    // Important is protected, a root level defer must not sweep it up
    expect(result.record.c.state).toBe("important");
    expect(result.record.d.state).toBe("ignored");
  });

  it("reports which instances it actually touched", () => {
    const record = recordOf(issueIn("a", "open"), issueIn("c", "important"));
    const result = deferRoot(record, ["a", "c"]);

    expect(result.outcomes).toEqual([{ issueId: "a", ok: true }]);
  });
});

describe("markRootImportant", () => {
  it("flags every eligible instance, open and deferred alike", () => {
    const record = recordOf(issueIn("a", "open"), issueIn("b", "deferred"));
    const result = markRootImportant(record, ["a", "b"]);

    expect(result.record.a.state).toBe("important");
    expect(result.record.b.state).toBe("important");
  });

  it("reports a rejection for an instance the state machine cannot flag, without failing the rest", () => {
    const record = recordOf(issueIn("a", "open"), issueIn("b", "ignored"));
    const result = markRootImportant(record, ["a", "b"]);

    expect(result.record.a.state).toBe("important");
    expect(result.record.b.state).toBe("ignored");
    expect(result.outcomes).toEqual([
      { issueId: "a", ok: true },
      {
        issueId: "b",
        ok: false,
        reason: "Cannot flag an issue in state 'ignored' as important"
      }
    ]);
  });
});

describe("unmarkRootImportant", () => {
  it("returns only the currently important instances to open", () => {
    const record = recordOf(
      issueIn("a", "important"),
      issueIn("b", "deferred"),
      issueIn("c", "ignored")
    );

    const result = unmarkRootImportant(record, ["a", "b", "c"]);

    expect(result.record.a.state).toBe("open");
    // Deferred and ignored instances are left out even though reopen would accept them
    expect(result.record.b.state).toBe("deferred");
    expect(result.record.c.state).toBe("ignored");
  });
});

describe("ignoreRoot", () => {
  it("applies one reason to every included instance", () => {
    const record = recordOf(issueIn("a", "open"), issueIn("b", "deferred"));
    const result = ignoreRoot(record, ["a", "b"], "Brand color, tracked for review", NOW);

    expect(result.record.a).toMatchObject({
      state: "ignored",
      ignoredReason: "Brand color, tracked for review",
      severityAtIgnore: "high"
    });
    expect(result.record.b.state).toBe("ignored");
  });

  it("rejects an empty reason for every instance, the state machine's own invariant", () => {
    const record = recordOf(issueIn("a", "open"));
    const result = ignoreRoot(record, ["a"], "   ", NOW);

    expect(result.record.a.state).toBe("open");
    expect(result.outcomes).toEqual([
      { issueId: "a", ok: false, reason: "A reason is required to ignore an issue" }
    ]);
  });
});

describe("reopenRoot", () => {
  it("returns only the ignored instances to open", () => {
    const record = recordOf(issueIn("a", "ignored"), issueIn("b", "important"));
    const result = reopenRoot(record, ["a", "b"]);

    expect(result.record.a.state).toBe("open");
    expect(result.record.b.state).toBe("important");
  });
});

describe("an issue id that no longer exists", () => {
  it("is reported as an outcome rather than thrown, for an action that does not pre-filter by state", () => {
    const result = markRootImportant(recordOf(issueIn("a", "open")), ["a", "missing"]);
    expect(result.outcomes).toEqual([
      { issueId: "a", ok: true },
      { issueId: "missing", ok: false, reason: "That issue no longer exists." }
    ]);
  });
});
