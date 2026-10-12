/** The designer selected a marked layer, the panel scrolls to and highlights that root */
export interface MarkerSelectedMessage {
  type: "MARKER_SELECTED";
  signature: string;
}

/** Said once in the panel, for example that the file is view only so there are no markers */
export interface MarkerNoticeMessage {
  type: "MARKER_NOTICE";
  message: string;
}

export type MarkerMessage = MarkerSelectedMessage | MarkerNoticeMessage;

export function isMarkerMessage(value: unknown): value is MarkerMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    (message.type === "MARKER_SELECTED" && typeof message.signature === "string") ||
    (message.type === "MARKER_NOTICE" && typeof message.message === "string")
  );
}
