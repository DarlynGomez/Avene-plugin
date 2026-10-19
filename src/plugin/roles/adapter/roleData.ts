import { ROLE_DATA_KEY, ROLE_RUN_KEY } from "../../../shared/roles/roleConfig";
import {
  parseRoleData,
  type RoleAnswer,
  type RoleData,
  type RoleSuggestion
} from "../../../shared/roles/roleStorage";

/** The role data of one node, absent when there is none or it is of another version */
export function readRoleData(node: BaseNode): RoleData | null {
  return parseRoleData(node.getPluginData(ROLE_DATA_KEY));
}

function write(node: BaseNode, data: RoleData): void {
  node.setPluginData(ROLE_DATA_KEY, JSON.stringify(data));
}

export function writeSuggestion(node: BaseNode, suggestion: RoleSuggestion): void {
  write(node, { ...(readRoleData(node) ?? { v: 1 }), v: 1, suggestion });
}

/** Takes the model suggestion away and keeps any answer, the layer then counts as never asked */
export function removeSuggestion(node: BaseNode): void {
  const data = readRoleData(node);
  if (data) write(node, { v: 1, answer: data.answer });
}

export function writeAnswer(node: BaseNode, answer: RoleAnswer): void {
  write(node, { ...(readRoleData(node) ?? { v: 1 }), v: 1, answer });
}

/** One record of a precompute run, kept in the file after every item so an interrupted run loses nothing */
export interface RunRecord {
  v: 1;
  startedAt: string;
  total: number;
  completed: number;
  skipped: number;
  failed: { nodeId: string; reason: string }[];
}

export function writeRunRecord(record: RunRecord): void {
  figma.root.setPluginData(ROLE_RUN_KEY, JSON.stringify(record));
}
