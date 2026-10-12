import type { MarkerRenderer } from "../../shared/markers/markerRenderer";

/**
 * The close handler cannot await, so it calls the synchronous clear directly
 * A plugin closing and leaving its markers in the designer's file is the outcome to avoid
 */
export function registerMarkerCloseClear(renderer: MarkerRenderer): void {
  figma.on("close", () => {
    renderer.clearSync();
  });
}
