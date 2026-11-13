import { describe, expect, it } from "vitest";

import type { IssueSummary } from "../issues/issueTypes";
import { assembleGroupableFinding, assembleGroupableFindings } from "./assembleFinding";

function issueSummary(overrides: Partial<IssueSummary> = {}): IssueSummary {
  return {
    id: "contrast:1:1",
    ruleId: "contrast",
    nodeId: "1:1",
    nodeName: "Item description subtext",
    screenId: "screen-1",
    screenName: "Product Detail Screen",
    state: "open",
    severityAtLastDetection: "high",
    encounterCount: 0,
    lastDetectedAt: "2026-09-08T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "sage/muted"
    },
    ...overrides
  };
}

describe("assembleGroupableFinding", () => {
  it("carries every field deriveRoots needs, from a fully resolved issue", () => {
    const finding = assembleGroupableFinding(issueSummary(), 3);

    expect(finding).toEqual({
      issueId: "contrast:1:1",
      nodeId: "1:1",
      nodeName: "Item description subtext",
      screenId: "screen-1",
      screenName: "Product Detail Screen",
      state: "open",
      severity: "high",
      measuredRatio: 2.17,
      requiredRatio: 4.5,
      foregroundHex: "#9CB5B1",
      backgroundHex: "#FFFFFF",
      foregroundBinding: "sage/muted",
      backgroundBinding: null,
      documentOrder: 3
    });
  });

  it("carries the time an issue was deferred, and nothing when there is none", () => {
    const at = "2026-11-13T10:00:00.000Z";
    expect(assembleGroupableFinding(issueSummary({ deferredAt: at }), 0)?.deferredAt).toBe(at);
    expect(assembleGroupableFinding(issueSummary(), 0)).not.toHaveProperty("deferredAt");
  });

  it("records an unbound foreground as null, not dropped", () => {
    const evidence = issueSummary().evidence as Record<string, unknown>;
    const finding = assembleGroupableFinding(
      issueSummary({ evidence: { ...evidence, foregroundBinding: null } }),
      0
    );
    expect(finding?.foregroundBinding).toBeNull();
  });

  it("returns null for a non-contrast issue", () => {
    expect(assembleGroupableFinding(issueSummary({ ruleId: "future-rule" }), 0)).toBeNull();
  });

  it("returns null when there is no evidence at all, the resolved-issue case", () => {
    expect(assembleGroupableFinding(issueSummary({ evidence: undefined }), 0)).toBeNull();
  });

  it("returns null when evidence is missing a required numeric field", () => {
    const evidence = issueSummary().evidence as Record<string, unknown>;
    const rest = { foregroundHex: evidence.foregroundHex, backgroundHex: evidence.backgroundHex };
    expect(assembleGroupableFinding(issueSummary({ evidence: rest }), 0)).toBeNull();
  });

  it("returns null when screen identity never resolved", () => {
    expect(
      assembleGroupableFinding(issueSummary({ screenId: undefined, screenName: undefined }), 0)
    ).toBeNull();
  });
});

describe("assembleGroupableFindings", () => {
  it("drops unusable issues without failing the rest", () => {
    const findings = assembleGroupableFindings([
      issueSummary({ id: "contrast:1:1" }),
      issueSummary({ id: "contrast:1:2", evidence: undefined }),
      issueSummary({ id: "contrast:1:3" })
    ]);
    expect(findings.map((f) => f.issueId)).toEqual(["contrast:1:1", "contrast:1:3"]);
  });

  it("assigns documentOrder from each issue's position in the received list", () => {
    const findings = assembleGroupableFindings([
      issueSummary({ id: "contrast:1:1" }),
      issueSummary({ id: "contrast:1:2" })
    ]);
    expect(findings[0].documentOrder).toBe(0);
    expect(findings[1].documentOrder).toBe(1);
  });
});
