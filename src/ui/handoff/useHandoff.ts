import { useCallback, useEffect, useState } from "react";

import {
  isHandoffPluginMessage,
  type HandoffDataMessage,
  type HandoffUiMessage
} from "../../shared/handoff/handoffMessages";
import type { DraftCache } from "../../shared/handoff/draftCache";
import type { NodeNote } from "../../shared/handoff/noteStorage";
import type { HandoffItemMeta } from "../../shared/handoff/types";

function send(message: HandoffUiMessage) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

/** Asks the sandbox for the handoff data and sends every write, each saved write asks again */
export function useHandoff() {
  const [data, setData] = useState<HandoffDataMessage | null>(null);
  const [refused, setRefused] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isHandoffPluginMessage(message)) return;
      if (message.type === "HANDOFF_REFUSED") setRefused(true);
      else if (message.type === "HANDOFF_DATA") setData(message);
      else if (message.type === "HANDOFF_ALT_INVENTORY") return;
      else if (message.saved) {
        setWriteError(null);
        send({ type: "HANDOFF_DATA_REQUEST" });
      } else setWriteError(message.error ?? "That could not be saved.");
    }
    window.addEventListener("message", onMessage);
    send({ type: "HANDOFF_DATA_REQUEST" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const setNotes = useCallback(
    (nodeId: string, notes: NodeNote[]) => send({ type: "HANDOFF_NOTES_SET", nodeId, notes }),
    []
  );
  const setMeta = useCallback(
    (signature: string, meta: HandoffItemMeta, live: string[]) =>
      send({ type: "HANDOFF_META_SET", signature, meta, live }),
    []
  );
  /** Selects the layers in the file and zooms to them, the same message Live Watch uses, nothing is written */
  const showOnCanvas = useCallback((nodeIds: readonly string[]) => {
    window.parent.postMessage(
      { pluginMessage: { type: "SHOW_ON_CANVAS", nodeIds: [...nodeIds] } },
      "*"
    );
  }, []);
  const setFileUrl = useCallback((url: string) => send({ type: "HANDOFF_FILE_URL_SET", url }), []);
  const setDrafts = useCallback(
    (drafts: DraftCache) => send({ type: "HANDOFF_DRAFTS_SET", drafts }),
    []
  );
  return { data, refused, writeError, setNotes, setMeta, setFileUrl, setDrafts, showOnCanvas };
}
