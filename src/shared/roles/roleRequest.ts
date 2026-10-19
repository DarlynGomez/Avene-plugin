import type { RoleInputs } from "./roleInputs";
import { ROLE_LABELS, type RoleLabel } from "./roleLabels";
import { ROLE_SERVER } from "./roleConfig";
import { sizeRatio } from "./screenCensus";

/** What goes to the server, no characters and no layer names, only numbers and the crop */
export interface RoleServerRequest {
  requestId: string;
  /** Base64 PNG */
  image: string;
  crop: "node" | "parent";
  exportScale: number;
  fontSizePx: number | null;
  inputs: {
    sizeRatio: number | null;
    fontWeight: number | null;
    wordCount: number;
    centerYFraction: number | null;
  };
  backgroundHex: string | null;
  mode: "live" | "precompute";
}

export interface RoleServerReply {
  label: RoleLabel;
  reason: string;
  model: string | null;
  ms: number;
}

export function serverInputs(inputs: RoleInputs): RoleServerRequest["inputs"] {
  return {
    sizeRatio: sizeRatio(inputs.fontSizePx, inputs.screenTextCensus),
    fontWeight: inputs.fontWeight,
    wordCount: inputs.wordCount,
    centerYFraction: inputs.centerYFraction
  };
}

/** Whether the text alone or its parent frame is exported: the parent only when it is a small frame */
export function chooseCrop(parent: { longestSide: number } | null): "node" | "parent" {
  if (ROLE_SERVER.cropContext !== "parent" || parent === null) return "node";
  return parent.longestSide <= ROLE_SERVER.cropParentMaxPx ? "parent" : "node";
}

/**
 * The export scale that leaves the text at least 14 pixels tall as sent, font size times scale
 * Rounded up to a half step, then held under the image cap, and null when the cap would make it too small
 */
export function exportScaleFor(
  fontSizePx: number | null,
  width: number,
  height: number
): number | null {
  if (fontSizePx === null || fontSizePx <= 0 || width <= 0 || height <= 0) return null;
  const { minTextPx, maxImageSide } = ROLE_SERVER;
  const wanted = Math.max(1, Math.ceil((minTextPx / fontSizePx) * 2) / 2);
  const longest = Math.max(width, height);
  if (longest * wanted <= maxImageSide) return wanted;
  const capped = maxImageSide / longest;
  return fontSizePx * capped + 1e-9 >= minTextPx ? capped : null;
}

/** The reply as the server sent it, anything else is unsure so a bad reply can never become a label */
export function readReply(value: unknown): RoleServerReply {
  const unsure = (reason: string): RoleServerReply => ({
    label: "unsure",
    reason,
    model: null,
    ms: 0
  });
  if (typeof value !== "object" || value === null) return unsure("malformed");
  const data = value as Record<string, unknown>;
  const label = ROLE_LABELS.find((candidate) => candidate === data.label);
  if (!label) return unsure("malformed");
  return {
    label,
    reason: typeof data.reason === "string" ? data.reason : "malformed",
    model: typeof data.model === "string" ? data.model : null,
    ms: typeof data.ms === "number" ? data.ms : 0
  };
}
