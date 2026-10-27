import type { RootDecision } from "../grouping/groupingTypes";
import type { HandoffFinding, HandoffInput } from "./types";

export function finding(overrides: Partial<HandoffFinding> = {}): HandoffFinding {
  return {
    issueId: "contrast:1:1",
    nodeId: "1:1",
    nodeName: "Helper text",
    screenId: "s1",
    screenName: "Payment",
    state: "open",
    severity: "medium",
    measuredRatio: 2.8,
    requiredRatio: 4.5,
    foregroundHex: "#9A9A9A",
    backgroundHex: "#FFFFFF",
    foregroundBinding: null,
    backgroundBinding: null,
    documentOrder: 0,
    ...overrides
  };
}

export const DECISION: RootDecision = {
  signature: "#FF7A1A|#FFFFFF|unbound|4.5",
  reason: "Brand campaign color,\nrequested by Marketing",
  recordedAt: "2026-10-27T10:00:00.000Z",
  severityAtDecision: "medium"
};

export function input(overrides: Partial<HandoffInput> = {}): HandoffInput {
  return {
    fileName: "Checkout",
    generatedAt: "2026-10-27T12:00:00.000Z",
    screens: [{ id: "s1", name: "Payment" }],
    findings: [],
    decisions: {},
    meta: {},
    changes: [],
    questions: [],
    ...overrides
  };
}

export function ignoredFinding(overrides: Partial<HandoffFinding> = {}): HandoffFinding {
  return finding({
    issueId: "contrast:2:1",
    nodeId: "2:1",
    nodeName: "Promo banner",
    state: "ignored",
    measuredRatio: 2.9,
    foregroundHex: "#FF7A1A",
    ...overrides
  });
}
