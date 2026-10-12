import {
  initialScreenState,
  msUntilSettle,
  reduceSelection,
  settleScreen,
  type CurrentScreenState,
  type SelectionEvent
} from "./currentScreen";

/** Milliseconds, an injected function so nothing here reads the system clock */
export type Clock = () => number;

/** The current screen over time, time comes only from the clock it is given */
export function createScreenTracker(clock: Clock, launchScreenId: string | null) {
  let state: CurrentScreenState = initialScreenState(launchScreenId);

  return {
    onSelection(event: SelectionEvent): void {
      state = reduceSelection(state, event, clock());
    },
    /** Call when the dwell timer fires, a no-op if the dwell has not passed */
    settle(): void {
      state = settleScreen(state, clock());
    },
    msUntilSettle: (): number | null => msUntilSettle(state, clock()),
    currentScreenId: (): string | null => state.current,
    /** A page change clears everything and chooses again */
    reset(newLaunchScreenId: string | null): void {
      state = initialScreenState(newLaunchScreenId);
    }
  };
}
