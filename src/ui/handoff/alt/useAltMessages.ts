import { useCallback, useEffect, useState } from "react";

import { isAltInventoryMessage } from "../../../shared/handoff/alt/altMessages";
import type { ImageLayer } from "../../../shared/handoff/alt/altTypes";
import { annotationFailureText } from "../../../shared/handoff/alt/altCopy";
import {
  isAnnotationPluginMessage,
  type AnnotationUiMessage
} from "../../../shared/handoff/alt/annotationMessages";
import type { AnnotationStatus } from "../../../shared/handoff/alt/annotationStatus";
import {
  isHandoffPluginMessage,
  type HandoffUiMessage
} from "../../../shared/handoff/handoffMessages";
import type { NodeNote } from "../../../shared/handoff/noteStorage";
import type { AltAnswer } from "./AltChecksContext";

type Outgoing =
  HandoffUiMessage | AnnotationUiMessage | { type: "SHOW_ON_CANVAS"; nodeIds: string[] };

function send(message: Outgoing) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

/**
 * The messages behind the alt text checks: the inventory, the notes, the annotation statuses and every write
 * Inert, sending and listening to nothing, unless the checks are available
 */
export function useAltMessages(available: boolean, annotationsOn: boolean) {
  const [layers, setLayers] = useState<readonly ImageLayer[] | null>(null);
  const [notes, setNotes] = useState<Readonly<Record<string, NodeNote[]>>>({});
  const [statuses, setStatuses] = useState<Readonly<Record<string, AnnotationStatus>>>({});
  const [error, setError] = useState<string | null>(null);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [annotationBusy, setAnnotationBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!available) return;
    send({ type: "HANDOFF_ALT_INVENTORY_REQUEST" });
    send({ type: "HANDOFF_DATA_REQUEST" });
  }, [available]);

  const askStatuses = useCallback(
    (data: Readonly<Record<string, NodeNote[]>>) => {
      const ids = Object.entries(data)
        .filter(([, list]) => list.some((note) => note.category === "alt"))
        .map(([id]) => id);
      if (annotationsOn && ids.length > 0) {
        send({ type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: ids });
      }
    },
    [annotationsOn]
  );

  useEffect(() => {
    if (!available) return undefined;
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (isAltInventoryMessage(message)) {
        setLayers(message.layers);
      } else if (isAnnotationPluginMessage(message)) {
        if (message.type === "HANDOFF_ANNOTATION_STATUSES") {
          setStatuses((previous) => ({ ...previous, ...message.statuses }));
        } else if (message.type === "HANDOFF_ANNOTATION_REFUSED") {
          setAnnotationBusy(false);
          setAnnotationError("Annotations are not available right now.");
        } else {
          setAnnotationBusy(false);
          setAnnotationError(
            message.ok ? null : annotationFailureText(message.reason, message.error)
          );
          send({ type: "HANDOFF_DATA_REQUEST" });
        }
      } else if (isHandoffPluginMessage(message)) {
        if (message.type === "HANDOFF_DATA") {
          setNotes(message.notes);
          askStatuses(message.notes);
        } else if (message.type === "HANDOFF_WRITE_RESULT" && message.target === "notes") {
          if (message.saved) {
            setError(null);
            send({ type: "HANDOFF_DATA_REQUEST" });
          } else setError(message.error ?? "That could not be saved.");
        }
      }
    }
    window.addEventListener("message", onMessage);
    refresh();
    return () => window.removeEventListener("message", onMessage);
  }, [available, askStatuses, refresh]);

  const saveNote = useCallback(
    (nodeIds: readonly string[], answer: AltAnswer) => {
      if (!available) return;
      for (const nodeId of nodeIds) send({ type: "HANDOFF_ALT_SET", nodeId, ...answer });
    },
    [available]
  );
  const annotationAction = useCallback(
    (type: "HANDOFF_ANNOTATE" | "HANDOFF_ANNOTATION_UPDATE" | "HANDOFF_ANNOTATION_REMOVE") =>
      (nodeId: string) => {
        if (!available || !annotationsOn) return;
        setAnnotationBusy(true);
        setAnnotationError(null);
        send({ type, nodeId });
      },
    [available, annotationsOn]
  );
  const locate = useCallback(
    (nodeIds: readonly string[]) => {
      if (available) send({ type: "SHOW_ON_CANVAS", nodeIds: [...nodeIds] });
    },
    [available]
  );

  return {
    layers,
    notes,
    statuses,
    error,
    annotationError,
    annotationBusy,
    refresh,
    saveNote,
    annotate: annotationAction("HANDOFF_ANNOTATE"),
    updateAnnotation: annotationAction("HANDOFF_ANNOTATION_UPDATE"),
    removeAnnotation: annotationAction("HANDOFF_ANNOTATION_REMOVE"),
    locate
  };
}
