/** Plugin data on an annotated layer, who wrote the marker and in which session */
export const MARKER_TAG_KEY = "cadt.marker.v1";

export const MARKER_CATEGORY_LABEL = "CADT";

export interface MarkerTag {
  userId: string;
  sessionId: string;
}

export function serializeTag(tag: MarkerTag): string {
  return JSON.stringify(tag);
}

/** Null for no tag or one that cannot be read, which is never treated as ours */
export function parseTag(raw: string): MarkerTag | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const { userId, sessionId } = parsed as Record<string, unknown>;
    return typeof userId === "string" && typeof sessionId === "string"
      ? { userId, sessionId }
      : null;
  } catch {
    return null;
  }
}
