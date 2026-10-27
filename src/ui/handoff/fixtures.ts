import type { HandoffDataMessage } from "../../shared/handoff/handoffMessages";
import type { HandoffItemMeta } from "../../shared/handoff/types";
import type { IssueSummary } from "../../shared/issues/issueTypes";
import { buildRootSignature } from "../../shared/issues/rootSignature";

export const HELPER_SIG = buildRootSignature({
  foregroundHex: "#9A9A9A",
  backgroundHex: "#FFFFFF",
  foregroundBinding: null,
  requiredRatio: 4.5
});
export const PRICE_SIG = buildRootSignature({
  foregroundHex: "#777777",
  backgroundHex: "#FFFFFF",
  foregroundBinding: null,
  requiredRatio: 4.5
});

function issue(id: string, name: string, hex: string): IssueSummary {
  return {
    id: `contrast:${id}`,
    ruleId: "contrast",
    nodeId: id,
    nodeName: name,
    screenId: "s1",
    screenName: "Payment",
    state: "open",
    severityAtLastDetection: "medium",
    encounterCount: 0,
    lastDetectedAt: "2026-10-28T00:00:00.000Z",
    evidence: {
      measuredRatio: 2.8,
      requiredRatio: 4.5,
      foregroundHex: hex,
      backgroundHex: "#FFFFFF",
      foregroundBinding: null
    }
  };
}

export function handoffData(meta: Record<string, HandoffItemMeta> = {}): HandoffDataMessage {
  return {
    type: "HANDOFF_DATA",
    generatedAt: "2026-10-28T12:00:00.000Z",
    fileName: "Checkout",
    issues: [issue("1:1", "Helper text", "#9A9A9A"), issue("1:2", "Price label", "#777777")],
    decisions: {},
    adjustLog: [],
    notes: {},
    noteNames: {},
    meta,
    fileUrl: null
  };
}

export function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}
