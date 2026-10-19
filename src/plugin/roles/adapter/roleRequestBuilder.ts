import { rgbToHex } from "../../../shared/colour/colorHex";
import type { RoleInputs } from "../../../shared/roles/roleInputs";
import {
  chooseCrop,
  exportScaleFor,
  serverInputs,
  type RoleServerRequest
} from "../../../shared/roles/roleRequest";
import { snapshotTextNode } from "../../detection/adapter/snapshot";

const FRAME_TYPES: ReadonlySet<string> = new Set(["FRAME", "COMPONENT", "INSTANCE"]);
let counter = 0;

function parentFrame(node: TextNode): (SceneNode & LayoutMixin) | null {
  const parent = node.parent;
  return parent && FRAME_TYPES.has(parent.type) ? (parent as SceneNode & LayoutMixin) : null;
}

/**
 * The crop and its properties for the server, or null when the text could not be sent legibly
 * This is the one place that exports an image of the participant's file
 */
export async function prepareRequest(
  node: TextNode,
  inputs: RoleInputs,
  mode: RoleServerRequest["mode"]
): Promise<RoleServerRequest | null> {
  const parent = parentFrame(node);
  const crop = chooseCrop(parent ? { longestSide: Math.max(parent.width, parent.height) } : null);
  const target: SceneNode & LayoutMixin = crop === "parent" && parent ? parent : node;
  const scale = exportScaleFor(inputs.fontSizePx, target.width, target.height);
  if (scale === null) return null;
  const bytes = await target.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: scale }
  });
  const snapshot = await snapshotTextNode(node);
  counter += 1;
  return {
    requestId: `${node.id}-${Date.now().toString(36)}-${counter}`,
    image: figma.base64Encode(bytes),
    crop,
    exportScale: scale,
    fontSizePx: inputs.fontSizePx,
    inputs: serverInputs(inputs),
    backgroundHex: snapshot.background ? rgbToHex(snapshot.background) : null,
    mode
  };
}
