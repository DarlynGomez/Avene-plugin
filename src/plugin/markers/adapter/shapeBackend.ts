import { nearlyEqual, shapeGeometry } from "../../../shared/markers/markerShape";
import type { Marker } from "../../../shared/markers/markerSet";
import type { BackendResult } from "./annotationBackend";
import { findTaggedNodes } from "./markerCategory";
import { rememberMarkerNode } from "./markerNodeRegistry";
import { makeContainer, paintShape, tagOf, type ShapeStyle } from "./shapeLayers";
import { MARKER_TAG_KEY, parseTag } from "./markerTags";

function removeNode(node: BaseNode): void {
  if (!node.removed) node.remove();
}

/**
 * The dot and ring styles, ellipses inside one locked frame at the top of the page
 * Everything it draws is tagged with the owner and the session, and everything is removed again on
 * a swap, a style change, markers off, close, and the launch sweep
 */
export function createShapeBackend(sessionId: string) {
  const shapes = new Map<string, EllipseNode>();
  let container: FrameNode | null = null;

  function ensureContainer(id: string): FrameNode {
    if (!container || container.removed || container.parent !== figma.currentPage) {
      container = makeContainer(id, sessionId);
    }
    return container;
  }

  async function apply(
    id: string,
    wanted: readonly Marker[],
    style: ShapeStyle
  ): Promise<BackendResult> {
    const created = new Map<string, EllipseNode>();
    let wrote = false;
    const wantedByNode = new Map(wanted.map((marker) => [marker.nodeId, marker]));

    for (const [nodeId, shape] of shapes) {
      if (!wantedByNode.has(nodeId) || shape.removed) {
        removeNode(shape);
        shapes.delete(nodeId);
        wrote = true;
      }
    }
    for (const marker of wanted) {
      const target = await figma.getNodeByIdAsync(marker.nodeId);
      const box = target && "absoluteBoundingBox" in target ? target.absoluteBoundingBox : null;
      if (!box) continue;
      const frame = ensureContainer(id);
      const geometry = shapeGeometry(style, box, figma.viewport.zoom);
      let shape = shapes.get(marker.nodeId);
      if (!shape) {
        shape = figma.createEllipse();
        shape.name = "Avene marker";
        shape.setPluginData(MARKER_TAG_KEY, tagOf(id, sessionId, "shape", marker.nodeId));
        frame.appendChild(shape);
        rememberMarkerNode(shape.id);
        shapes.set(marker.nodeId, shape);
        created.set(marker.nodeId, shape);
        wrote = true;
      }
      const x = geometry.x - frame.x;
      const y = geometry.y - frame.y;
      const differs =
        !nearlyEqual(shape.x, x) ||
        !nearlyEqual(shape.y, y) ||
        !nearlyEqual(shape.width, geometry.size) ||
        !nearlyEqual(shape.strokeWeight as number, geometry.strokeWeight) ||
        (shape.fills as readonly Paint[]).length !== (geometry.filled ? 1 : 0);
      if (differs) {
        shape.resize(geometry.size, geometry.size);
        shape.x = x;
        shape.y = y;
        paintShape(shape, style, geometry.strokeWeight);
        wrote = true;
      }
    }
    if (shapes.size === 0 && container && !container.removed) {
      removeNode(container);
      container = null;
      wrote = true;
    }
    return {
      wrote,
      rollback: () => {
        for (const [nodeId, shape] of created) {
          try {
            removeNode(shape);
            shapes.delete(nodeId);
          } catch {
            // Nothing more can be done for a layer that cannot be written
          }
        }
      }
    };
  }

  /** The close handler, removes from live references first, then anything tagged that came back */
  function releaseAll(userId: string | null): void {
    for (const shape of shapes.values()) removeNode(shape);
    shapes.clear();
    if (container) removeNode(container);
    container = null;
    if (userId !== null) {
      for (const node of findTaggedNodes()) {
        const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
        if (tag?.kind && tag.userId === userId && tag.sessionId === sessionId) removeNode(node);
      }
    }
  }

  return {
    apply,
    releaseAll,
    liveNodeIds: (): string[] => [
      ...[...shapes.values()].map((shape) => shape.id),
      ...(container && !container.removed ? [container.id] : [])
    ]
  };
}
