/** Plugin data on a layer CADT wrote to or drew, who did it and in which session */
export const MARKER_TAG_KEY = "cadt.marker.v1";

export const MARKER_CATEGORY_LABEL = "CADT";

/** What a drawn layer is, a shape for one marker or the frame that holds them */
export type TagKind = "shape" | "container";

export interface MarkerTag {
  userId: string;
  sessionId: string;
  /** Set only on drawn layers */
  kind?: TagKind;
  /** The layer a drawn shape points at */
  target?: string;
  /** The label an annotation marker was written with, empty or the single dot fallback */
  label?: string;
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
    const { userId, sessionId, kind, target, label } = parsed as Record<string, unknown>;
    if (typeof userId !== "string" || typeof sessionId !== "string") {
      return null;
    }
    return {
      userId,
      sessionId,
      ...(kind === "shape" || kind === "container" ? { kind } : {}),
      ...(typeof target === "string" ? { target } : {}),
      ...(typeof label === "string" ? { label } : {})
    };
  } catch {
    return null;
  }
}
