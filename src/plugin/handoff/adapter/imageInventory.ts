import type { ImageLayer } from "../../../shared/handoff/alt/altTypes";
import { resolveScreen } from "../../detection/adapter/resolveScreen";

/** The hash of the first image fill that is switched on, or null when the layer paints no picture */
function imageHashOf(node: SceneNode): string | null {
  if (!("fills" in node) || !Array.isArray(node.fills)) return null;
  const paint = (node.fills as readonly Paint[]).find(
    (fill) => fill.type === "IMAGE" && fill.visible !== false && fill.imageHash
  );
  return paint && paint.type === "IMAGE" ? paint.imageHash : null;
}

/** Detection treats a hidden layer or a hidden ancestor as not measurable, so the inventory leaves them out the same way */
function isShown(node: BaseNode): boolean {
  for (
    let current: BaseNode | null = node;
    current && current.type !== "PAGE";
    current = current.parent
  ) {
    if ("visible" in current && !current.visible) return false;
  }
  return true;
}

/** Visible layers with an image fill on the current page, the page the contrast scan reads; a read only, on request */
export function listImageLayers(): ImageLayer[] {
  const layers: ImageLayer[] = [];
  figma.currentPage.findAll((node) => {
    const imageHash = imageHashOf(node);
    if (imageHash === null || !isShown(node)) return false;
    const { screenId, screenName } = resolveScreen(node);
    layers.push({
      nodeId: node.id,
      name: node.name,
      screenId,
      screenName,
      width: node.width,
      height: node.height,
      imageHash
    });
    return false;
  });
  return layers;
}
