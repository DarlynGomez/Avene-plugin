import { registerDocumentChangeListener } from "./listeners";
import { startMarkers } from "./markerRuntime";
import { scanAndSync } from "./scanAndSync";
import {
  initializeReEncounterFromCurrentSelection,
  registerSelectionChangeListener
} from "./selectionListener";

function collectTextNodeIds(page: PageNode): Set<string> {
  const textNodes = page.findAllWithCriteria({ types: ["TEXT"] });
  return new Set(textNodes.map((node) => node.id));
}

/** Current page only, a deliberate performance limit */
async function scanCurrentPage(): Promise<void> {
  await scanAndSync(collectTextNodeIds(figma.currentPage), "initial scan");
}

/**
 * Startup order is load all pages, then listen, then scan
 * A listener registered before pages load never fires and detection silently does nothing
 * The guard starts from the current selection so a still selected issue stays quiet
 */
export async function startDetectionLifecycle(): Promise<void> {
  await figma.loadAllPagesAsync();
  registerDocumentChangeListener();
  registerSelectionChangeListener();
  await initializeReEncounterFromCurrentSelection();
  await scanCurrentPage();
  await startMarkers();
}
