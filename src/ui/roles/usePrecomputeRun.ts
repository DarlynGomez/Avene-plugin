import { useEffect, useState } from "react";

import { isRolePluginMessage, type PrecomputeSummary } from "../../shared/roles/roleMessages";
import { runPrecomputeItem } from "./runPrecomputeItem";
import { askRoleServer } from "./roleServerClient";
import { sendRole } from "./sendRole";

export type PrecomputeUi =
  | { status: "idle" }
  | { status: "running"; index: number; total: number }
  | { status: "stopped"; index: number; total: number; reason: string }
  | { status: "done"; summary: PrecomputeSummary };

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** The researcher's precompute run: the sandbox sends each crop, this asks the server and sends the answer back */
export function usePrecomputeRun(): PrecomputeUi {
  const [ui, setUi] = useState<PrecomputeUi>({ status: "idle" });

  useEffect(() => {
    let stopped = false;
    async function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isRolePluginMessage(message) || stopped) return;
      if (message.type === "ROLE_PRECOMPUTE_START") {
        setUi({ status: "running", index: 0, total: message.total });
      } else if (message.type === "ROLE_PRECOMPUTE_DONE") {
        setUi({ status: "done", summary: message.summary });
      } else if (message.type === "ROLE_PRECOMPUTE_ITEM") {
        setUi({ status: "running", index: message.index, total: message.total });
        const outcome = await runPrecomputeItem(message.request, {
          ask: (request, timeoutMs) => askRoleServer(request, timeoutMs),
          sleep,
          random: Math.random
        });
        if (outcome.kind === "transport") {
          stopped = true;
          sendRole({
            type: "ROLE_PRECOMPUTE_RESULT",
            nodeId: message.nodeId,
            reply: null,
            failure: outcome.failure
          });
          setUi({
            status: "stopped",
            index: message.index,
            total: message.total,
            reason: outcome.failure
          });
        } else {
          sendRole({
            type: "ROLE_PRECOMPUTE_RESULT",
            nodeId: message.nodeId,
            reply: outcome.reply,
            failure: null
          });
        }
      }
    }
    window.addEventListener("message", onMessage);
    sendRole({ type: "ROLE_PRECOMPUTE_SUBSCRIBE" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return ui;
}
