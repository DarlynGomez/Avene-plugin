import { CONTAINER_NAME } from "../../../shared/markers/markerShape";
import type { SweepResult } from "../../../shared/markers/markerRenderer";
import { isAnnotatable, releaseNode } from "./annotationWrites";
import type { MarkerScope } from "./isCadtMarker";
import {
  findCategory,
  findTaggedNodes,
  listCategoryIds,
  removeCategoryIfUnused
} from "./markerCategory";
import { MARKER_TAG_KEY, parseTag } from "./markerTags";

/** Top level frames of every page that carry the container's name, found without the tag search */
function topLevelContainers(): SceneNode[] {
  const pages = Array.isArray(figma.root.children) ? figma.root.children : [];
  return pages.flatMap((page) =>
    "children" in page
      ? page.children.filter((child: SceneNode) => child.name === CONTAINER_NAME)
      : []
  );
}

/**
 * Cleans this user's tagged layers that are not in the live set, which covers a crash or force
 * quit, the other machine, copies of a tagged layer and an undo that left markers behind, and
 * leaves everyone else's alone
 * Drawn shapes and their container are removed, annotations are stripped and the tag cleared
 */
export async function sweepTaggedNodes(
  userId: string,
  liveNodeIds: ReadonlySet<string>,
  sessionId: string
): Promise<SweepResult> {
  const category = await findCategory();
  const scope: MarkerScope = {
    userId,
    sessionId: null,
    categoryId: category?.id ?? null,
    existingCategoryIds: await listCategoryIds()
  };
  const result: SweepResult = { cleaned: 0, left: 0 };
  const cleanedIds = new Set<string>();

  const candidates = new Map<string, SceneNode>();
  for (const node of [...findTaggedNodes(), ...topLevelContainers()]) candidates.set(node.id, node);

  for (const node of candidates.values()) {
    const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
    const alive = liveNodeIds.has(node.id) && tag?.sessionId === sessionId;
    if (!tag || tag.userId !== userId || alive || node.removed) {
      result.left += 1;
      continue;
    }
    if (tag.kind) {
      node.remove();
    } else if (isAnnotatable(node)) {
      releaseNode(node, scope);
    } else {
      result.left += 1;
      continue;
    }
    cleanedIds.add(node.id);
    result.cleaned += 1;
  }

  if (category && cleanedIds.size > 0) {
    removeCategoryIfUnused(category, cleanedIds);
  }
  return result;
}
