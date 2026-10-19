import type { RoleUiMessage } from "../../shared/roles/roleMessages";

export function sendRole(message: RoleUiMessage): void {
  window.parent.postMessage({ pluginMessage: message }, "*");
}
