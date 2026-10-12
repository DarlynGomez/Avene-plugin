import type { Marker } from "../../../shared/markers/markerSet";
import {
  isAnnotatable,
  isTaggedByAnotherUser,
  markersOn,
  releaseNode,
  removeMarkers,
  setMarker,
  type AnnotatableNode
} from "./annotationWrites";
import type { MarkerScope } from "./isCadtMarker";
import {
  ensureCategory,
  findCategory,
  listCategoryIds,
  removeCategoryIfUnused
} from "./markerCategory";

export interface BackendResult {
  wrote: boolean;
  /** Puts back what this call did, for a write that turns out to be refused */
  rollback: () => void;
}

/**
 * The annotation style, a CADT category annotation with no text
 * Every call reads the real annotations on the layers it has touched and writes only what differs
 * from the wanted set, so an undo, a deleted category or an edit by hand is repaired and not trusted
 * Keeps live references to every layer it tagged so a close can undo its writes without awaiting
 */
export function createAnnotationBackend(sessionId: string) {
  const live = new Map<string, AnnotatableNode>();
  let lastCategory: AnnotationCategory | null = null;
  let lastScope: MarkerScope | null = null;
  let recordedLabel = "";
  let noted = false;

  async function apply(id: string, wanted: readonly Marker[]): Promise<BackendResult> {
    const category = wanted.length > 0 ? await ensureCategory() : await findCategory();
    lastCategory = category ?? lastCategory;
    const scope: MarkerScope = {
      userId: id,
      sessionId,
      categoryId: category?.id ?? null,
      existingCategoryIds: await listCategoryIds()
    };
    lastScope = scope;
    const touched: AnnotatableNode[] = [];
    const wantedByNode = new Map(wanted.map((marker) => [marker.nodeId, marker]));

    for (const [nodeId, node] of live) {
      if (!wantedByNode.has(nodeId) && removeMarkers(node, scope)) touched.push(node);
    }
    for (const marker of wanted) {
      const node = live.get(marker.nodeId) ?? (await figma.getNodeByIdAsync(marker.nodeId));
      if (!category || !isAnnotatable(node) || isTaggedByAnotherUser(node, id)) continue;
      const here = markersOn(node, scope);
      const correct =
        here.length === 1 &&
        (here[0]?.label ?? "") === recordedLabel &&
        here[0]?.categoryId === category.id;
      if (!correct) {
        recordedLabel = setMarker(
          node,
          category.id,
          { userId: id, sessionId },
          scope,
          recordedLabel
        );
        if (recordedLabel !== "" && !noted) {
          noted = true;
          console.info(
            "markers (development): Figma refused an annotation with no label, using a dot"
          );
        }
        touched.push(node);
      }
      live.set(node.id, node);
    }
    return {
      wrote: touched.length > 0,
      rollback: () => {
        for (const node of touched) {
          try {
            removeMarkers(node, scope);
          } catch {
            // Nothing more can be done for a layer that cannot be written
          }
        }
      }
    };
  }

  /** The close handler, markers and tags go and the category with them when nothing else uses it */
  function releaseAll(): void {
    if (lastScope) {
      for (const node of live.values()) releaseNode(node, lastScope);
    }
    live.clear();
    if (lastCategory) removeCategoryIfUnused(lastCategory);
  }

  return { apply, releaseAll, liveNodeIds: (): string[] => [...live.keys()] };
}
