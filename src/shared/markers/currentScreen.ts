/** How long a selection must stay on a new screen before it becomes the current one */
export const SCREEN_DWELL_MS = 600;

export interface CurrentScreenState {
  /** Screen id the markers follow, null until a screen is known */
  current: string | null;
  /** A different screen the selection is on, waiting out the dwell */
  pending: { screenId: string; since: number } | null;
}

/** What one selection change tells us, the screens are those of the selected nodes */
export interface SelectionEvent {
  origin: "designer" | "plugin";
  screenIds: readonly string[];
}

/** Read once at launch from the screen under the viewport centre, or null when there is none */
export function initialScreenState(launchScreenId: string | null): CurrentScreenState {
  return { current: launchScreenId, pending: null };
}

/** Takes effect the moment the dwell has passed, the selection stayed on that screen until now */
export function settleScreen(state: CurrentScreenState, now: number): CurrentScreenState {
  if (state.pending && now - state.pending.since >= SCREEN_DWELL_MS) {
    return { current: state.pending.screenId, pending: null };
  }
  return state;
}

/** Milliseconds until a waiting screen takes effect, null when nothing is waiting */
export function msUntilSettle(state: CurrentScreenState, now: number): number | null {
  if (!state.pending) {
    return null;
  }
  return Math.max(0, state.pending.since + SCREEN_DWELL_MS - now);
}

/**
 * Applies one selection change to the current screen
 * A selection the plugin made changes nothing at all
 * Deselecting and mixed selections keep the current screen and drop any waiting one, since the
 * selection is no longer staying on it
 */
export function reduceSelection(
  state: CurrentScreenState,
  event: SelectionEvent,
  now: number
): CurrentScreenState {
  if (event.origin === "plugin") {
    return state;
  }
  const settled = settleScreen(state, now);
  const screens = new Set(event.screenIds);

  if (screens.size !== 1) {
    return { current: settled.current, pending: null };
  }
  const [screenId] = [...screens] as [string];
  if (screenId === settled.current) {
    return { current: settled.current, pending: null };
  }
  if (settled.pending?.screenId === screenId) {
    return settled;
  }
  return { current: settled.current, pending: { screenId, since: now } };
}
