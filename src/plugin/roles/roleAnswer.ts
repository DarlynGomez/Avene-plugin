import { decideRole } from "../../shared/roles/roleRules";
import type { RoleLabel } from "../../shared/roles/roleLabels";
import { inputKeyOf, shownSuggestion, type RoleResponse } from "../../shared/roles/roleStorage";
import { buildRoleAnswered } from "../../shared/study/studyOtherEvents";
import { emitStudy } from "../study/adapter/studyEmitter";
import { readRoleData, writeAnswer } from "./adapter/roleData";
import { inputsFor, textNodeById } from "./adapter/roleState";

/**
 * Keeps the participant's answer on the node and logs it with where the shown label came from
 * Nothing is logged outside a study session, and the answer is kept either way
 */
export async function recordAnswer(
  nodeId: string,
  role: RoleLabel,
  response: RoleResponse
): Promise<void> {
  const node = await textNodeById(nodeId);
  if (!node) return;
  const inputs = await inputsFor(node);
  const rule = decideRole(inputs);
  const suggestion = shownSuggestion(readRoleData(node), inputKeyOf(inputs));
  const ruleShown = rule.role !== "unsure";
  const from = ruleShown ? "rule" : suggestion ? "ai" : "none";
  const at = new Date().toISOString();
  writeAnswer(node, { role, response, from, at });
  const aiSource = suggestion?.live ? "ai_live" : "ai_precomputed";
  emitStudy((ctx) => [
    buildRoleAnswered(ctx, at, nodeId, role, {
      source: ruleShown ? "rule" : suggestion ? aiSource : "none",
      suggested: ruleShown ? rule.role : (suggestion?.label ?? null),
      response,
      ...(ruleShown && rule.ruleId ? { ruleId: rule.ruleId } : {}),
      ...(!ruleShown && suggestion?.model ? { model: suggestion.model } : {})
    })
  ]);
}
