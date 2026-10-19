import type { ReportRow } from "../../../shared/roles/roleReport";
import { decideRole } from "../../../shared/roles/roleRules";
import { alreadyAsked, inputKeyOf } from "../../../shared/roles/roleStorage";
import { buildScreenCensus, snapshotRoleInputs } from "../../detection/adapter/roleInputs";
import { resolveScreen } from "../../detection/adapter/resolveScreen";
import { readRoleData } from "./roleData";

export interface Plan {
  queue: string[];
  rows: Map<string, ReportRow>;
  order: string[];
  skipped: number;
}

export function rowFor(node: TextNode, patch: Partial<ReportRow>): ReportRow {
  return {
    screen: resolveScreen(node).screenName,
    layerName: node.name,
    nodeId: node.id,
    by: "none",
    label: "",
    reasonOrFailure: "",
    reviewed: false,
    ...patch
  };
}

/** Every visible text node is listed, only those no rule decided and nobody has asked about are sent */
export async function plan(): Promise<Plan> {
  await figma.loadAllPagesAsync();
  const nodes = figma.root.findAll((n) => n.type === "TEXT" && n.visible) as TextNode[];
  const census = new Map<string, Awaited<ReturnType<typeof buildScreenCensus>>>();
  const state: Plan = { queue: [], rows: new Map(), order: nodes.map((n) => n.id), skipped: 0 };
  for (const node of nodes) {
    const screenId = resolveScreen(node).screenId;
    if (!census.has(screenId)) census.set(screenId, await buildScreenCensus(node));
    const inputs = await snapshotRoleInputs(node, census.get(screenId) ?? []);
    const rule = decideRole(inputs);
    const stored = readRoleData(node)?.suggestion;
    if (rule.role !== "unsure") {
      state.skipped += 1;
      state.rows.set(
        node.id,
        rowFor(node, {
          by: "rule",
          label: rule.role,
          reasonOrFailure: `${rule.ruleId}: ${rule.reason}`,
          reviewed: true
        })
      );
    } else if (stored && alreadyAsked(readRoleData(node), inputKeyOf(inputs))) {
      state.skipped += 1;
      state.rows.set(
        node.id,
        rowFor(node, {
          by: "ai",
          label: stored.label,
          reasonOrFailure: "ok",
          reviewed: stored.reviewed
        })
      );
    } else {
      state.queue.push(node.id);
    }
  }
  return state;
}
