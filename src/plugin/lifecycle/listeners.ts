import { createChangeBuffer } from "../detection/changeBuffer";
import { isRelevantPropertyChange } from "../detection/relevance";
import { activePreviewNodeIds } from "../adjust/adapter/previewState";
import { isMarkerNodeId } from "../markers/adapter/markerNodeRegistry";
import { MARKER_TAG_KEY } from "../markers/adapter/markerTags";
import { scanAndSync } from "./scanAndSync";

/**
 * Wires documentchange through the buffer and filter into detection and the issue store
 * Registered only after loadAllPagesAsync resolves, otherwise the listener never fires
 * Nodes under an active preview are skipped so a preview is not rescanned
 * and resolved before the designer chooses to keep it
 */
/**
 * A change to anything CADT drew, or a new layer that carries its tag such as a copy a designer
 * made, never counts, so markers can not start a scan
 */
function isMarkerChange(change: DocumentChange): boolean {
  if (
    change.type === "STYLE_CREATE" ||
    change.type === "STYLE_DELETE" ||
    change.type === "STYLE_PROPERTY_CHANGE"
  ) {
    return false;
  }
  if (isMarkerNodeId(change.id)) {
    return true;
  }
  const node = change.type === "CREATE" ? change.node : null;
  return (
    typeof node === "object" &&
    node !== null &&
    "getPluginData" in node &&
    node.getPluginData(MARKER_TAG_KEY) !== ""
  );
}

export function registerDocumentChangeListener(): void {
  const buffer = createChangeBuffer({
    onFlush: (nodeIds) => {
      void scanAndSync(nodeIds, "scan");
    },
    scheduleTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
    clearScheduledTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
  });

  figma.on("documentchange", (event) => {
    const previewed = activePreviewNodeIds();
    for (const change of event.documentChanges) {
      if (previewed.has(change.id) || isMarkerChange(change)) {
        continue;
      }
      if (change.type === "CREATE" || change.type === "DELETE") {
        buffer.add(change.id);
        continue;
      }
      if (change.type === "PROPERTY_CHANGE" && isRelevantPropertyChange(change.properties)) {
        buffer.add(change.id);
      }
    }
  });
}
