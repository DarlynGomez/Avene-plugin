import { resolveScreen } from "../../detection/adapter/resolveScreen";

function contains(node: SceneNode, point: Vector): boolean {
  const box = node.absoluteBoundingBox;
  return (
    box !== null &&
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/** Deepest layer under the point among a node's children, or the node itself */
function deepestAt(node: SceneNode, point: Vector): SceneNode {
  if ("children" in node) {
    for (const child of [...node.children].reverse()) {
      if (contains(child, point)) {
        return deepestAt(child, point);
      }
    }
  }
  return node;
}

/**
 * The screen under the centre of the viewport, read once so markers appear where the designer is
 * already looking, null on an empty page
 */
export function screenUnderViewportCenter(): string | null {
  const center = figma.viewport.center;
  const top = [...figma.currentPage.children].reverse().find((node) => contains(node, center));
  return top ? resolveScreen(deepestAt(top, center)).screenId : null;
}
