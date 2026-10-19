import { useEffect, useState } from "react";

import { isRolePluginMessage } from "../../shared/roles/roleMessages";
import type { ReviewResult } from "../../shared/roles/reviewDecision";
import { sendRole } from "./sendRole";

export type ReviewUi =
  | { status: "idle" }
  | { status: "export"; count: number; csv: string }
  | { status: "import"; result: ReviewResult | null };

/** The researcher's review commands: the sandbox says which one opened the panel, then sends the file or the counts */
export function useRoleReview(): ReviewUi {
  const [ui, setUi] = useState<ReviewUi>({ status: "idle" });

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isRolePluginMessage(message)) return;
      if (message.type === "ROLE_REVIEW_MODE") {
        setUi(
          message.mode === "export"
            ? { status: "export", count: message.count, csv: message.csv }
            : { status: "import", result: null }
        );
      } else if (message.type === "ROLE_REVIEW_RESULT") {
        setUi({ status: "import", result: message.result });
      }
    }
    window.addEventListener("message", onMessage);
    sendRole({ type: "ROLE_REVIEW_SUBSCRIBE" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return ui;
}
