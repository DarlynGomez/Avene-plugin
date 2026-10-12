import { useCallback, useEffect, useState } from "react";

import type {
  AdjustFillBinding,
  AdjustOptionChoice,
  AdjustPaletteColor,
  AdjustReplyMessage,
  AdjustScopeChoice
} from "../../../shared/adjustMessageTypes";
import type { RGBColor } from "../../../shared/issues/issueTypes";
import type { UiToPluginMessage } from "../../../shared/messageTypes";

function sendMessage(message: UiToPluginMessage) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

function isAdjustReply(value: unknown): value is AdjustReplyMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const type = (value as Record<string, unknown>).type;
  return typeof type === "string" && type.startsWith("ADJUST_");
}

export interface AdjustOptionsData {
  palette: readonly AdjustPaletteColor[];
  binding: AdjustFillBinding | null;
}

/** Requests the file palette on mount, and exposes preview, clear, and apply */
export function useAdjustMessages(issueId: string) {
  const [options, setOptions] = useState<AdjustOptionsData | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isAdjustReply(message)) {
        return;
      }
      if (message.type === "ADJUST_OPTIONS_READY" && message.issueId === issueId) {
        setOptions({ palette: message.palette, binding: message.binding });
      } else if (message.type === "ADJUST_APPLIED" && message.issueId === issueId) {
        setApplied(true);
      } else if (message.type === "ADJUST_ACTION_FAILED" && message.issueId === issueId) {
        setActionError(message.message);
      }
    }

    window.addEventListener("message", handleMessage);
    sendMessage({ type: "ADJUST_OPTIONS_REQUEST", issueId });
    return () => window.removeEventListener("message", handleMessage);
  }, [issueId]);

  // issueId matches replies to this popup, issueIds is what actually gets written
  const preview = useCallback(
    (color: RGBColor, issueIds: readonly string[]) => {
      setActionError(null);
      sendMessage({ type: "ADJUST_PREVIEW", issueId, issueIds: [...issueIds], color });
    },
    [issueId]
  );

  const clearPreview = useCallback(() => {
    sendMessage({ type: "ADJUST_CLEAR_PREVIEW" });
  }, []);

  const apply = useCallback(
    (
      color: RGBColor,
      issueIds: readonly string[],
      optionChosen: AdjustOptionChoice,
      wheelOpened: boolean,
      hexRejected: boolean
    ) => {
      setActionError(null);
      sendMessage({
        type: "ADJUST_APPLY",
        issueId,
        issueIds: [...issueIds],
        color,
        optionChosen,
        wheelOpened,
        hexRejected
      });
    },
    [issueId]
  );

  const abandon = useCallback(
    (
      issueIds: readonly string[],
      scope: AdjustScopeChoice,
      wheelOpened: boolean,
      hexRejected: boolean
    ) => {
      sendMessage({
        type: "ADJUST_ABANDONED",
        issueId,
        issueIds: [...issueIds],
        scope,
        wheelOpened,
        hexRejected
      });
    },
    [issueId]
  );

  return { options, actionError, applied, preview, clearPreview, apply, abandon };
}
