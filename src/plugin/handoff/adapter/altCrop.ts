import type { AltCropMessage } from "../../../shared/handoff/alt/altMessages";
import { nodeById } from "./nodeLookup";

/** The longest side of the picture sent for a suggestion, in pixels, a placeholder to tune from a measured run */
export const ALT_CROP_MAX_SIDE = 768;
/** A small layer is sent larger, but never more than this, so an icon is not blown up into blur */
const MAX_UPSCALE = 2;

type Crop = Extract<AltCropMessage, { type: "HANDOFF_ALT_CROP" }>;

/** The scale that brings the longest side to the cap, shrinking a big layer and growing a small one a little */
export function cropScale(width: number, height: number): number {
  const longest = Math.max(width, height, 1);
  return Math.min(MAX_UPSCALE, ALT_CROP_MAX_SIDE / longest);
}

/**
 * An image of one layer, read from the file and written nowhere, for the local server to describe
 * The roles exporter is built around a text layer's font size, so this follows its export call and not its code
 */
export async function exportAltCrop(nodeId: string): Promise<Crop> {
  const node = await nodeById(nodeId);
  if (node === null || ("removed" in node && node.removed)) {
    return { type: "HANDOFF_ALT_CROP", nodeId, ok: false, reason: "layer-gone" };
  }
  if (!("exportAsync" in node) || !("width" in node)) {
    return { type: "HANDOFF_ALT_CROP", nodeId, ok: false, reason: "export-failed" };
  }
  const scale = cropScale(node.width, node.height);
  try {
    const bytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: scale }
    });
    return {
      type: "HANDOFF_ALT_CROP",
      nodeId,
      ok: true,
      image: figma.base64Encode(bytes),
      width: Math.round(node.width),
      height: Math.round(node.height)
    };
  } catch {
    return { type: "HANDOFF_ALT_CROP", nodeId, ok: false, reason: "export-failed" };
  }
}
