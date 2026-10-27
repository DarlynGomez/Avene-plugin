import {
  isHandoffUiMessage,
  type HandoffPluginMessage
} from "../../shared/handoff/handoffMessages";
import { isRoleUiMessage, type RolePluginMessage } from "../../shared/roles/roleMessages";
import { isExplanationMessage } from "../../shared/study/explanationMessageTypes";
import { handleExplanationMessage } from "./explanationProtocol";
import { handleHandoffMessage } from "./handoffProtocol";
import { handleRoleMessage } from "./roleProtocol";

/** Checked without waiting, so a message that is neither costs the router no extra turn */
export function isExplanationOrRole(message: Record<string, unknown>): boolean {
  return isRoleUiMessage(message) || isExplanationMessage(message) || isHandoffUiMessage(message);
}

/** The panel's explanation and role messages */
export async function handleExplanationOrRole(
  message: Record<string, unknown>,
  reply: (message: RolePluginMessage | HandoffPluginMessage) => void
): Promise<void> {
  if (isRoleUiMessage(message)) await handleRoleMessage(message, reply);
  else if (isHandoffUiMessage(message)) await handleHandoffMessage(message, reply);
  else if (isExplanationMessage(message)) handleExplanationMessage(message);
}
