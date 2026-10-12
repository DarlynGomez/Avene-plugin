import { isMarkerLabel } from "../../../shared/markers/markerLabel";
import { MARKER_TAG_KEY, parseTag } from "./markerTags";

/** Who is asking and what the CADT category looks like right now */
export interface MarkerScope {
  userId: string;
  /** The session whose markers count, null for every session of this user, as the sweep does */
  sessionId: string | null;
  /** The CADT category id, null when there is none */
  categoryId: string | null;
  /** Every category that exists in the file, so a category id that is not in it is dangling */
  existingCategoryIds: ReadonlySet<string>;
}

/**
 * The one test every removal uses, close, the launch sweep, a screen swap and switching off
 * A marker is an annotation on a layer this user tagged, in the CADT category, or with no category
 * left to be in and the label CADT wrote, which is what an undo can leave behind
 */
export function isCadtMarker(
  annotation: Annotation,
  node: { getPluginData: (key: string) => string },
  scope: MarkerScope
): boolean {
  const tag = parseTag(node.getPluginData(MARKER_TAG_KEY));
  if (!tag || tag.userId !== scope.userId) {
    return false;
  }
  if (scope.sessionId !== null && tag.sessionId !== scope.sessionId) {
    return false;
  }
  if (scope.categoryId !== null && annotation.categoryId === scope.categoryId) {
    return true;
  }
  const categoryGone =
    annotation.categoryId === undefined || !scope.existingCategoryIds.has(annotation.categoryId);
  if (!categoryGone || tag.kind !== undefined) {
    return false;
  }
  const label = annotation.label ?? annotation.labelMarkdown ?? "";
  // The label the marker was written with is recorded on the layer, empty or a single dot, and
  // an annotation of a designer's own with no label and no category on such a layer matches too
  return isMarkerLabel(label) || (tag.label !== undefined && label === tag.label);
}
