import {
  annotationStatus,
  type AnnotationStatus
} from "../../../shared/handoff/alt/annotationStatus";
import { parseNodeNotes } from "../../../shared/handoff/noteStorage";
import { KEY_NODE_NOTES } from "../handoffKeys";
import { observe } from "./altAnnotation";
import { findAltCategoryId } from "./altCategory";
import { nodeById } from "./nodeLookup";

/** A read of where each layer's note and annotation stand, writes nothing and creates no category */
export async function annotationStatuses(nodeIds: readonly string[]) {
  const categoryId = await findAltCategoryId();
  const statuses: Record<string, AnnotationStatus> = {};
  for (const id of nodeIds) {
    const node = await nodeById(id);
    if (node === null || ("removed" in node && node.removed)) continue;
    const alt = parseNodeNotes(node.getPluginData(KEY_NODE_NOTES)).find(
      (n) => n.category === "alt"
    );
    statuses[id] = annotationStatus(alt, observe(node, categoryId, alt?.annotatedHash));
  }
  return statuses;
}
