import { FEATURE_MARKERS } from "../../shared/featureFlags";
import { MARKER_STYLE } from "../../shared/markers/markerStyle";
import { assembleGroupableFindings } from "../../shared/grouping/assembleFinding";
import { deriveRoots } from "../../shared/grouping/deriveRoots";
import type { IssueSummary } from "../../shared/issues/issueTypes";
import { createMarkerController } from "../../shared/markers/markerController";
import { ZOOM_POLL_MS, zoomChanged } from "../../shared/markers/markerShape";
import { participantVisibility } from "../../shared/study/participantVisibility";
import { buildMarkerState } from "../../shared/study/studyEventBuilders";
import { createMarkerRenderer } from "../markers/adapter/markerRenderer";
import { screenUnderViewportCenter } from "../markers/adapter/viewportScreen";
import { emitStudy } from "../study/adapter/studyEmitter";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { registerMarkerCloseClear } from "./markerLifecycle";

const renderer = createMarkerRenderer();
let instance: ReturnType<typeof createMarkerController> | null = null;

/** On only with the feature, and while the participant is allowed to see feedback if in a session */
function markersVisible(): boolean {
  return FEATURE_MARKERS && participantVisibility(activeStudySession()).canvasMarkers;
}

function launchScreen(): string | null {
  try {
    return screenUnderViewportCenter();
  } catch (error) {
    console.error("markers: could not read the screen under the viewport", error);
    return null;
  }
}

/** Built on first use, so nothing reads the viewport unless markers are on */
function controller(): ReturnType<typeof createMarkerController> {
  instance ??= createMarkerController({
    renderer,
    clock: () => Date.now(),
    schedule: (callback, ms) => setTimeout(callback, ms),
    cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    isVisible: markersVisible,
    style: () => MARKER_STYLE,
    launchScreenId: launchScreen,
    onNotice: (message) => figma.ui.postMessage({ type: "MARKER_NOTICE", message }),
    onStateChange: (change, markerCount, style) => {
      const at = new Date().toISOString();
      emitStudy((ctx) => [
        buildMarkerState(ctx, at, change !== "hidden", change, markerCount, style)
      ]);
    }
  });
  return instance;
}

/** Every time the issue list is built, the markers follow it */
export function markersOnIssues(issues: readonly IssueSummary[]): void {
  if (FEATURE_MARKERS) {
    controller().onRoots(deriveRoots(assembleGroupableFindings(issues)));
  }
}

/** A session started, was revealed, ended or exited */
export function markersOnStudyChange(): void {
  if (FEATURE_MARKERS) {
    void controller().refreshVisibility();
  }
}

/** At launch, clean up after earlier sessions first, then draw, and clear on close and page change */
export async function startMarkers(): Promise<void> {
  if (!FEATURE_MARKERS) {
    return;
  }
  registerMarkerCloseClear(renderer);
  figma.on("currentpagechange", () => controller().onPageChange());
  // The typings list no property for annotations, so any change to a layer CADT marked counts
  // An undo or an edit by hand is then read back and repaired after a pause
  figma.on("documentchange", (event) => {
    const live = renderer.liveNodeIds();
    const touched = event.documentChanges.some(
      (change) => change.type === "PROPERTY_CHANGE" && live.has(change.id)
    );
    if (touched) controller().onAnnotationsChanged();
  });
  watchZoom();
  await renderer.sweepOrphans();
  await controller().refreshVisibility();
}

/**
 * Figma has no zoom event in a design file, so the zoom is looked at on a short timer
 * A change of a few percent redraws the dots and rings, a timer that finds nothing writes nothing
 */
function watchZoom(): void {
  let lastZoom = figma.viewport.zoom;
  const timer = setInterval(() => {
    const zoom = figma.viewport.zoom;
    if (zoomChanged(lastZoom, zoom)) {
      lastZoom = zoom;
      controller().onZoomChange();
    }
  }, ZOOM_POLL_MS);
  figma.on("close", () => clearInterval(timer));
}

export const markerController = controller;
