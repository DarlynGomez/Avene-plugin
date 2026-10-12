import { FEATURE_MARKERS } from "../../shared/featureFlags";
import { assembleGroupableFindings } from "../../shared/grouping/assembleFinding";
import { deriveRoots } from "../../shared/grouping/deriveRoots";
import type { IssueSummary } from "../../shared/issues/issueTypes";
import { createMarkerController } from "../../shared/markers/markerController";
import { participantVisibility } from "../../shared/study/participantVisibility";
import { buildMarkerState } from "../../shared/study/studyEventBuilders";
import { resolveScreen } from "../detection/adapter/resolveScreen";
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
    launchScreenId: launchScreen,
    onNotice: (message) => figma.ui.postMessage({ type: "MARKER_NOTICE", message }),
    onStateChange: (change, markerCount) => {
      const at = new Date().toISOString();
      emitStudy((ctx) => [buildMarkerState(ctx, at, change !== "hidden", change, markerCount)]);
    }
  });
  return instance;
}

/**
 * Fed by the selection listener with the plugin originated flag it already read for this event
 * Selecting a marked layer tells the panel to scroll to its root, the selection itself is never set
 */
export function markersOnSelection(isPluginOriginated: boolean): void {
  if (!FEATURE_MARKERS) {
    return;
  }
  const selected = figma.currentPage.selection;
  controller().onSelection(
    {
      origin: isPluginOriginated ? "plugin" : "designer",
      screenIds: selected.map((node) => resolveScreen(node).screenId)
    },
    selected.map((node) => node.id)
  );
  if (isPluginOriginated) {
    return;
  }
  for (const node of selected) {
    const marker = controller().markerForNode(node.id);
    if (marker) {
      figma.ui.postMessage({ type: "MARKER_SELECTED", signature: marker.signature });
      return;
    }
  }
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
  await renderer.sweepOrphans();
  await controller().refreshVisibility();
}

export const markerController = controller;
