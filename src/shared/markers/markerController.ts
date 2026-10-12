import type { Root } from "../grouping/groupingTypes";
import type { MarkerStateChange } from "../study/studyEvents";
import { SCREEN_DWELL_MS, type SelectionEvent } from "./currentScreen";
import type { MarkerRenderer } from "./markerRenderer";
import { buildMarkerSet, type Marker } from "./markerSet";
import { createScreenTracker, type Clock } from "./screenTracker";

export interface MarkerControllerDeps {
  renderer: MarkerRenderer;
  clock: Clock;
  schedule: (callback: () => void, ms: number) => unknown;
  cancel: (handle: unknown) => void;
  /** The feature is on and the study session, if any, shows feedback right now */
  isVisible: () => boolean;
  /** The screen under the viewport centre, read at launch and on a page change */
  launchScreenId: () => string | null;
  onNotice: (message: string) => void;
  /** For the study log, never told which screen */
  onStateChange: (change: MarkerStateChange, markerCount: number) => void;
}

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
  let timer: unknown = null;
  let queue: Promise<void> = Promise.resolve();

  async function run(): Promise<void> {
    if (!deps.isVisible()) {
      if (active) {
        await deps.renderer.clear();
        active = false;
        shownScreen = null;
        markers = [];
        deps.onStateChange("hidden", 0);
      }
      return;
    }
    const screen = tracker.currentScreenId();
    const next = buildMarkerSet(roots, screen, designerOrder);
    const result = await deps.renderer.show(screen ?? "", next);
    if (!result.written) {
      if (result.notice) deps.onNotice(result.notice);
      return;
    }
    markers = next;
    if (!active) {
      active = true;
      shownScreen = screen;
      deps.onStateChange("shown", next.length);
    } else if (shownScreen !== screen) {
      shownScreen = screen;
      deps.onStateChange("screen_changed", next.length);
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
    /** The session changed or the preference did, show or hide to match */
    refreshVisibility: (): Promise<void> => refresh(),
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
