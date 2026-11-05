import type { AnnotationStatus } from "./annotationStatus";

export type AnnotationAction = "annotate" | "update" | "remove";

/** Each message is for one layer, there is no message that writes more than that */
export type AnnotationUiMessage =
  | { type: "HANDOFF_ANNOTATE"; nodeId: string }
  | { type: "HANDOFF_ANNOTATION_UPDATE"; nodeId: string }
  | { type: "HANDOFF_ANNOTATION_REMOVE"; nodeId: string }
  /** A read, the only message that takes a list */
  | { type: "HANDOFF_ANNOTATION_STATUS_REQUEST"; nodeIds: string[] };

/** Why an action did nothing, plain data so the panel can say it in its own words */
export type AnnotationFailure =
  | "layer-gone"
  | "layer-type"
  | "no-note"
  | "reserved-text"
  | "already-annotated"
  | "changed-on-canvas"
  | "read-only"
  | "note-not-saved";

export type AnnotationPluginMessage =
  | {
      type: "HANDOFF_ANNOTATION_RESULT";
      action: AnnotationAction;
      nodeId: string;
      ok: true;
      status: AnnotationStatus;
    }
  | {
      type: "HANDOFF_ANNOTATION_RESULT";
      action: AnnotationAction;
      nodeId: string;
      ok: false;
      reason: AnnotationFailure;
      error?: string;
    }
  | { type: "HANDOFF_ANNOTATION_STATUSES"; statuses: Record<string, AnnotationStatus> }
  /** Sent for every annotation message while the flag is off, handoff is off or a study is active */
  | { type: "HANDOFF_ANNOTATION_REFUSED" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isAnnotationUiMessage(value: unknown): value is AnnotationUiMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "HANDOFF_ANNOTATE":
    case "HANDOFF_ANNOTATION_UPDATE":
    case "HANDOFF_ANNOTATION_REMOVE":
      return typeof value.nodeId === "string";
    case "HANDOFF_ANNOTATION_STATUS_REQUEST":
      return Array.isArray(value.nodeIds) && value.nodeIds.every((id) => typeof id === "string");
    default:
      return false;
  }
}

export function isAnnotationPluginMessage(value: unknown): value is AnnotationPluginMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "HANDOFF_ANNOTATION_REFUSED":
      return true;
    case "HANDOFF_ANNOTATION_STATUSES":
      return isRecord(value.statuses);
    case "HANDOFF_ANNOTATION_RESULT":
      return typeof value.nodeId === "string" && typeof value.ok === "boolean";
    default:
      return false;
  }
}
