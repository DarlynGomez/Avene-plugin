import { useCallback, useEffect, useRef } from "react";

import { isAltPluginMessage, type AltCropMessage } from "../../../shared/handoff/alt/altMessages";

type Crop = Extract<AltCropMessage, { type: "HANDOFF_ALT_CROP" }>;
const CROP_TIMEOUT_MS = 15000;

/** Asks the plugin for a picture of one layer and waits for the answer, which is a failure and not a hang when it never comes */
export function useAltCrop(available: boolean) {
  const waiting = useRef(new Map<string, (crop: Crop) => void>());

  useEffect(() => {
    if (!available) return undefined;
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isAltPluginMessage(message) || message.type !== "HANDOFF_ALT_CROP") return;
      waiting.current.get(message.nodeId)?.(message);
      waiting.current.delete(message.nodeId);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [available]);

  return useCallback(
    (nodeId: string): Promise<Crop> =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          waiting.current.delete(nodeId);
          resolve({ type: "HANDOFF_ALT_CROP", nodeId, ok: false, reason: "export-failed" });
        }, CROP_TIMEOUT_MS);
        waiting.current.set(nodeId, (crop) => {
          clearTimeout(timer);
          resolve(crop);
        });
        window.parent.postMessage(
          { pluginMessage: { type: "HANDOFF_ALT_CROP_REQUEST", nodeId } },
          "*"
        );
      }),
    []
  );
}
