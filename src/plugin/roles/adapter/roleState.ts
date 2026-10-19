import type { RoleStateView } from "../../../shared/roles/roleMessages";
import { decideRole } from "../../../shared/roles/roleRules";
import { alreadyAsked, inputKeyOf, shownSuggestion } from "../../../shared/roles/roleStorage";
import type { RoleInputs } from "../../../shared/roles/roleInputs";
import { buildScreenCensus, snapshotRoleInputs } from "../../detection/adapter/roleInputs";
import { readRoleData } from "./roleData";
import { prepareRequest } from "./roleRequestBuilder";
import { roleGate } from "../roleGate";

/** The text node, or null for anything that is not text or has gone */
export async function textNodeById(nodeId: string): Promise<TextNode | null> {
  const node = await figma.getNodeByIdAsync(nodeId);
  return node && node.type === "TEXT" ? node : null;
}

export async function inputsFor(node: TextNode): Promise<RoleInputs> {
  return snapshotRoleInputs(node, await buildScreenCensus(node));
}

const EMPTY = (nodeId: string, allowed: boolean): RoleStateView => ({
  nodeId,
  allowed,
  rule: null,
  suggestion: null,
  answer: null,
  request: null
});

/**
 * Everything the panel needs for one layer. A rule that decides means the server is never called,
 * and a request is made only for an undecided layer nobody has answered or asked about, in a session
 */
export async function buildRoleState(nodeId: string): Promise<RoleStateView> {
  const gate = roleGate();
  const node = await textNodeById(nodeId);
  if (!node || !gate.allowed) return EMPTY(nodeId, gate.allowed);
  const inputs = await inputsFor(node);
  const rule = decideRole(inputs);
  const data = readRoleData(node);
  const key = inputKeyOf(inputs);
  const stored = shownSuggestion(data, key);
  const needsServer =
    gate.liveAllowed &&
    rule.role === "unsure" &&
    !data?.answer &&
    !stored &&
    !alreadyAsked(data, key);
  return {
    nodeId,
    allowed: true,
    rule:
      rule.role === "unsure" || rule.ruleId === null
        ? null
        : { role: rule.role, ruleId: rule.ruleId, reason: rule.reason },
    suggestion:
      rule.role === "unsure" && stored
        ? { label: stored.label, model: stored.model, live: stored.live }
        : null,
    answer: data?.answer ? { role: data.answer.role, response: data.answer.response } : null,
    request: needsServer ? await prepareRequest(node, inputs, "live") : null
  };
}
