import type { SweepResult } from "../../../shared/markers/markerRenderer";
import { isAnnotatable, removeMarkerAnnotations } from "./annotationWrites";
import { findCategory, findTaggedNodes, removeCategoryIfUnused } from "./markerCategory";
import { MARKER_TAG_KEY, parseTag } from "./markerTags";

/**
 * Cleans this user's tagged layers that are not in the live set, which covers a crash or force
 * quit, the other machine, and copies of a tagged layer, and leaves everyone else's alone
 */
export async function sweepTaggedNodes(
  userId: string,
  liveNodeIds: ReadonlySet<string>,
  sessionId: string
): Promise<SweepResult> {
  const category = await findCategory();
  const result: SweepResult = { cleaned: 0, left: 0 };
  const cleanedIds = new Set<string>();

  for (const node of findTaggedNodes()) {
    const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
    const alive = liveNodeIds.has(node.id) && tag?.sessionId === sessionId;
    if (!tag || tag.userId !== userId || alive || !isAnnotatable(node)) {
      result.left += 1;
      continue;
    }
    removeMarkerAnnotations(node, category?.id ?? null, (found) => found.userId === userId);
    cleanedIds.add(node.id);
    result.cleaned += 1;
  }

  if (category && cleanedIds.size > 0) {
    removeCategoryIfUnused(category, cleanedIds);
  }
  return result;
}
