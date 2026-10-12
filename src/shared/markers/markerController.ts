import type { Root } from "../grouping/groupingTypes";
import { SCREEN_DWELL_MS, type SelectionEvent } from "./currentScreen";
import { ANNOTATION_RECONCILE_MS, type MarkerControllerDeps } from "./markerControllerTypes";
import { buildMarkerSet, type Marker } from "./markerSet";
import type { MarkerStyle } from "./markerStyle";
import { createScreenTracker } from "./screenTracker";

/**
 * Keeps the markers matching the issue list, the current screen and what the participant may see
 * Every change goes through one queue, so writes never overlap, and only the difference is drawn
 */
export function createMarkerController(deps: MarkerControllerDeps) {
  const tracker = createScreenTracker(deps.clock, deps.launchScreenId());
  let roots: readonly Root[] = [];
  let designerOrder: readonly string[] = [];
  let markers: Marker[] = [];
  let active = false;
  let shownScreen: string | null = null;
  let shownStyle: MarkerStyle = deps.style();
  let timer: unknown = null;
  let reconcileTimer: unknown = null;
  let zoomQueued = false;
  let queue: Promise<void> = Promise.resolve();

  async function run(undoStep = true): Promise<void> {
    if (!deps.isVisible()) {
      if (active) {
        await deps.renderer.clear();
        active = false;
        shownScreen = null;
        markers = [];
        deps.onStateChange("hidden", 0, shownStyle);
      }
      return;
    }
    const screen = tracker.currentScreenId();
    const next = buildMarkerSet(roots, screen, designerOrder);
    const style = deps.style();
    const result = await deps.renderer.show(screen ?? "", next, style, undoStep);
    if (!result.written) {
      if (result.notice) deps.onNotice(result.notice);
      return;
    }
    markers = next;
    shownStyle = style;
    if (!active) {
      active = true;
      shownScreen = screen;
      deps.onStateChange("shown", next.length, style);
    } else if (shownScreen !== screen) {
      shownScreen = screen;
      deps.onStateChange("screen_changed", next.length, style);
    }
  }

  /** A failed step is logged and the queue carries on, so one bad write never blocks the rest */
  function enqueue(step: () => Promise<void>): Promise<void> {
    queue = queue.then(step).catch((error: unknown) => {
      console.error("markerController: a marker update failed", error);
    });
    return queue;
  }

  function refresh(): Promise<void> {
    return enqueue(run);
  }

  function waitOutDwell(): void {
    if (timer !== null) deps.cancel(timer);
    timer = null;
    const wait = tracker.msUntilSettle();
    if (wait !== null) {
      timer = deps.schedule(() => {
        timer = null;
        tracker.settle();
        void refresh();
      }, wait);
    }
  }

  return {
    /** A designer selection moves the screen after the dwell, a plugin one changes nothing */
    onSelection(event: SelectionEvent, selectedNodeIds: readonly string[]): void {
      if (event.origin === "plugin") {
        return;
      }
      designerOrder = selectedNodeIds;
      tracker.onSelection(event);
      waitOutDwell();
      void refresh();
    },
    onRoots(next: readonly Root[]): void {
      roots = next;
      void refresh();
    },
    /**
     * An annotation on a layer CADT wrote to changed, an undo or an edit by hand
     * After a quiet moment the canvas is read and only the difference is written, which settles
     * on its own because a write that matches the canvas causes no change
     */
    onAnnotationsChanged(): void {
      if (!deps.isVisible()) {
        return;
      }
      if (reconcileTimer !== null) deps.cancel(reconcileTimer);
      reconcileTimer = deps.schedule(() => {
        reconcileTimer = null;
        void refresh();
      }, ANNOTATION_RECONCILE_MS);
    },
    /** The session changed or the preference did, show or hide to match */
    refreshVisibility: (): Promise<void> => refresh(),
    /** The zoom changed, dots and rings are resized without an undo step, an annotation needs nothing */
    onZoomChange(): void {
      if (zoomQueued || !deps.isVisible() || deps.style() === "annotation") {
        return;
      }
      zoomQueued = true;
      void enqueue(() => {
        zoomQueued = false;
        return run(false);
      });
    },
    /** Another look was chosen, the old one is removed and the new one drawn in one pass */
    onStyleChange: (): Promise<void> => refresh(),
    /** Page change clears every marker and chooses the screen again */
    onPageChange(): void {
      if (timer !== null) deps.cancel(timer);
      timer = null;
      tracker.reset(deps.launchScreenId());
      void enqueue(async () => {
        await deps.renderer.clear();
        markers = [];
        shownScreen = null;
      });
      void refresh();
    },
    markerForNode: (nodeId: string): Marker | undefined =>
      markers.find((marker) => marker.nodeId === nodeId),
    currentScreenId: (): string | null => tracker.currentScreenId(),
    /** Resolves once every queued write has finished */
    idle: (): Promise<void> => queue,
    dwellMs: SCREEN_DWELL_MS
  };
}

export { ANNOTATION_RECONCILE_MS };
export type { MarkerControllerDeps };
