import { FEATURE_MARKERS } from "../../shared/featureFlags";
import { resolveScreen } from "../detection/adapter/resolveScreen";
import { shapeTargetOf } from "../markers/adapter/shapeTarget";
import { markerController } from "./markerRuntime";

/**
 * Fed by the selection listener with the plugin originated flag it already read for this event
 * Selecting a marked layer tells the panel to scroll to its root, the selection itself is never set
 */
export function markersOnSelection(isPluginOriginated: boolean): void {
  if (!FEATURE_MARKERS) {
    return;
  }
  const userId = figma.currentUser?.id ?? null;
  // Clicking a dot or a ring counts as clicking the layer it marks, and never as moving screens
  const selected = figma.currentPage.selection.map((node) => ({
    node,
    target: shapeTargetOf(node, userId)
  }));
  const screenIds = selected.flatMap(({ node, target }) => {
    if (target === null) return [resolveScreen(node).screenId];
    const marker = markerController().markerForNode(target);
    return marker ? [marker.screenId] : [];
  });
  markerController().onSelection(
    { origin: isPluginOriginated ? "plugin" : "designer", screenIds },
    selected.map(({ node, target }) => target ?? node.id)
  );
  if (isPluginOriginated) {
    return;
  }
  for (const { node, target } of selected) {
    const marker = markerController().markerForNode(target ?? node.id);
    if (marker) {
      figma.ui.postMessage({ type: "MARKER_SELECTED", signature: marker.signature });
      return;
    }
  }
}
