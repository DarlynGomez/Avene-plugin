import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildRootSignature } from "../../shared/issues/rootSignature";
import type { GroupableFinding } from "../../shared/grouping/groupingTypes";

const SAGE_ON_WHITE = {
  foregroundHex: "#9CB5B1",
  backgroundHex: "#FFFFFF",
  foregroundBinding: "sage/muted",
  requiredRatio: 4.5
};
const SIGNATURE = buildRootSignature(SAGE_ON_WHITE);

const PAGE = { type: "PAGE", backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }] };
function textNode(id: string) {
  return {
    id,
    name: `Text ${id}`,
    type: "TEXT",
    fontSize: 16,
    fontName: { family: "Inter", style: "Regular" },
    fills: [{ type: "SOLID", color: { r: 0.611, g: 0.71, b: 0.694 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    parent: PAGE
  };
}

/**
 * Runs real decision storage with the shared matching function
 * The signature stored under must equal the one matching computes for a later finding
 */
describe("a root decision, recorded then matched by a later finding", () => {
  let pluginData: Record<string, string> = {};
  const getPluginData = vi.fn((key: string) => pluginData[key] ?? "");
  const setPluginData = vi.fn((key: string, value: string) => {
    pluginData[key] = value;
  });
  const getNodeByIdAsync = vi.fn(async (id: string) => textNode(id));

  beforeEach(() => {
    pluginData = {
      "cadt.issues.v1": JSON.stringify({
        "contrast:1:1": {
          state: "open",
          severityAtLastDetection: "high",
          encounterCount: 0,
          lastDetectedAt: "2026-09-08T00:00:00.000Z"
        }
      })
    };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", { root: { getPluginData, setPluginData }, getNodeByIdAsync });
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("offers the same reason at the same or better severity, and suppresses it once severity worsens", async () => {
    const { handleRootMessage } = await import("./rootActionsProtocol");
    const { loadDecisions } = await import("../accountability/decisionStore");
    const { matchRootDecision } = await import("../../shared/grouping/decisionMatch");

    const reply = vi.fn();
    await handleRootMessage(
      {
        type: "ROOT_IGNORE",
        issueIds: ["contrast:1:1"],
        reason: "Brand color required by guidelines; tracked for the next brand review",
        signature: SIGNATURE,
        fromDecisionOffer: false
      },
      reply
    );

    const decisions = loadDecisions();
    expect(decisions[SIGNATURE]).toMatchObject({
      reason: "Brand color required by guidelines; tracked for the next brand review",
      severityAtDecision: "high"
    });

    function instanceAt(severity: GroupableFinding["severity"]): GroupableFinding {
      return {
        issueId: "contrast:2:1",
        nodeId: "2:1",
        nodeName: "New instance",
        screenId: "screen-1",
        screenName: "Screen",
        state: "open",
        severity,
        measuredRatio: 2.17,
        backgroundBinding: null,
        documentOrder: 0,
        ...SAGE_ON_WHITE
      };
    }

    const sameSeverity = { instances: [instanceAt("high")], ...SAGE_ON_WHITE };
    expect(matchRootDecision(sameSeverity, decisions)).toMatchObject({ offered: true });

    const betterSeverity = { instances: [instanceAt("low")], ...SAGE_ON_WHITE };
    expect(matchRootDecision(betterSeverity, decisions)).toMatchObject({ offered: true });

    // A worse severity than the decision is a different tradeoff
    const worseSeverity = { instances: [instanceAt("high")], ...SAGE_ON_WHITE };
    const worseDecision = {
      ...decisions,
      [SIGNATURE]: { ...decisions[SIGNATURE], severityAtDecision: "low" as const }
    };
    expect(matchRootDecision(worseSeverity, worseDecision)).toEqual({
      offered: false,
      decision: worseDecision[SIGNATURE],
      reason: "worse-severity"
    });
  });
});
