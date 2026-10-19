import { useCallback, useEffect, useState } from "react";

import { ROLE_SERVER } from "../../shared/roles/roleConfig";
import { isRolePluginMessage, type RoleStateView } from "../../shared/roles/roleMessages";
import type { RoleLabel } from "../../shared/roles/roleLabels";
import type { RoleResponse } from "../../shared/roles/roleStorage";
import { askRoleServer } from "./roleServerClient";
import { roleServerSession } from "./roleSession";
import { sendRole } from "./sendRole";

export interface RoleQuestionState {
  view: RoleStateView | null;
  answer: (role: RoleLabel, response: RoleResponse) => void;
}

/** The question for one layer, null until the sandbox has answered, and nothing at all when disabled */
export function useRoleState(nodeId: string | null, enabled: boolean): RoleQuestionState {
  const [view, setView] = useState<RoleStateView | null>(null);

  useEffect(() => {
    setView(null);
    if (!nodeId || !enabled) return undefined;
    let current = true;
    async function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!current || !isRolePluginMessage(message) || message.type !== "ROLE_STATE") return;
      if (message.state.nodeId !== nodeId) return;
      setView(message.state);
      const request = message.state.request;
      // A failure here is never shown, the layer just has no suggestion and the panel carries on
      if (!request || !nodeId || !roleServerSession.shouldAsk(nodeId)) return;
      const result = await askRoleServer(request, ROLE_SERVER.liveTimeoutMs);
      if (result.kind === "transport") return roleServerSession.markTransportFailure();
      sendRole({ type: "ROLE_SERVER_RESULT", nodeId, reply: result.reply });
    }
    window.addEventListener("message", onMessage);
    sendRole({ type: "ROLE_QUERY", nodeId });
    return () => {
      current = false;
      window.removeEventListener("message", onMessage);
    };
  }, [nodeId, enabled]);

  const answer = useCallback(
    (role: RoleLabel, response: RoleResponse) => {
      if (nodeId) sendRole({ type: "ROLE_ANSWER", nodeId, role, response });
    },
    [nodeId]
  );
  return { view, answer };
}
