import type { InstanceRoles } from "../teachMeWhy/explanationKey";
import { toExplanationRole, type RoleLabel } from "./roleLabels";

/**
 * The roles an explanation key reads for one layer: the participant's answer first, then the rule
 * Not sure gives unknown, and a model suggestion is never here until it is answered
 */
export function toInstanceRoles(rule: RoleLabel | null, answer: RoleLabel | null): InstanceRoles {
  return {
    confirmed: answer === null ? null : toExplanationRole(answer),
    ruleDecided: rule === null || rule === "unsure" ? null : toExplanationRole(rule)
  };
}
