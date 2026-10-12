import { describe, expect, it } from "vitest";

import {
  SCREEN_DWELL_MS,
  initialScreenState,
  msUntilSettle,
  reduceSelection,
  settleScreen,
  type CurrentScreenState,
  type SelectionEvent
} from "./currentScreen";
import { createScreenTracker } from "./screenTracker";

const designer = (...screenIds: string[]): SelectionEvent => ({ origin: "designer", screenIds });
const plugin = (...screenIds: string[]): SelectionEvent => ({ origin: "plugin", screenIds });

describe("the dwell constant", () => {
  it("is 600 milliseconds", () => {
    expect(SCREEN_DWELL_MS).toBe(600);
  });
});

describe("starting state", () => {
  it("is the launch screen with nothing waiting", () => {
    expect(initialScreenState("A")).toEqual({ current: "A", pending: null });
  });

  it("can start with no screen known", () => {
    expect(initialScreenState(null)).toEqual({ current: null, pending: null });
  });
});

describe("a single screen selection", () => {
  it("does not move the current screen before the dwell", () => {
    const state = reduceSelection(initialScreenState("A"), designer("B"), 1000);

    expect(state.current).toBe("A");
    expect(state.pending).toEqual({ screenId: "B", since: 1000 });
  });

  it("takes effect once the selection has stayed for the dwell", () => {
    const waiting = reduceSelection(initialScreenState("A"), designer("B"), 1000);

    expect(settleScreen(waiting, 1000 + SCREEN_DWELL_MS - 1).current).toBe("A");
    expect(settleScreen(waiting, 1000 + SCREEN_DWELL_MS).current).toBe("B");
    expect(settleScreen(waiting, 1000 + SCREEN_DWELL_MS).pending).toBeNull();
  });

  it("treats several layers on one screen as one screen", () => {
    expect(reduceSelection(initialScreenState("A"), designer("B", "B", "B"), 0).pending).toEqual({
      screenId: "B",
      since: 0
    });
  });

  it("sets the first screen when none is known yet, after the dwell", () => {
    const waiting = reduceSelection(initialScreenState(null), designer("A"), 0);

    expect(waiting.current).toBeNull();
    expect(settleScreen(waiting, SCREEN_DWELL_MS).current).toBe("A");
  });

  it("keeps the original start time while the selection stays on the waiting screen", () => {
    let state = reduceSelection(initialScreenState("A"), designer("B"), 1000);
    state = reduceSelection(state, designer("B"), 1300);

    expect(state.pending).toEqual({ screenId: "B", since: 1000 });
  });

  it("applies a waiting screen that has already outlasted the dwell before the next change", () => {
    let state = reduceSelection(initialScreenState("A"), designer("B"), 0);
    state = reduceSelection(state, designer("C"), SCREEN_DWELL_MS + 100);

    expect(state.current).toBe("B");
    expect(state.pending).toEqual({ screenId: "C", since: SCREEN_DWELL_MS + 100 });
  });

  it("drops a waiting screen when the selection returns to the current one", () => {
    let state = reduceSelection(initialScreenState("A"), designer("B"), 0);
    state = reduceSelection(state, designer("A"), 200);

    expect(state).toEqual({ current: "A", pending: null });
  });
});

describe("selections that keep the current screen", () => {
  const settled: CurrentScreenState = { current: "A", pending: null };

  it("keeps it when everything is deselected", () => {
    expect(reduceSelection(settled, designer(), 5000)).toEqual(settled);
  });

  it("keeps it when the selection spans two screens", () => {
    expect(reduceSelection(settled, designer("A", "B"), 5000)).toEqual(settled);
    expect(reduceSelection(settled, designer("B", "C"), 5000)).toEqual(settled);
  });

  it("drops a waiting screen on deselect or a mixed selection, the selection left it", () => {
    const waiting = reduceSelection(settled, designer("B"), 0);

    expect(reduceSelection(waiting, designer(), 100).pending).toBeNull();
    expect(reduceSelection(waiting, designer("B", "C"), 100).pending).toBeNull();
    expect(reduceSelection(waiting, designer(), 100).current).toBe("A");
  });

  it("does not let a waiting screen mature across a deselect", () => {
    let state = reduceSelection(settled, designer("B"), 0);
    state = reduceSelection(state, designer(), 200);
    state = reduceSelection(state, designer(), 5000);

    expect(state.current).toBe("A");
  });

  it("keeps it for an empty selection with no current screen", () => {
    expect(reduceSelection(initialScreenState(null), designer(), 0)).toEqual({
      current: null,
      pending: null
    });
  });
});

describe("a selection the plugin made", () => {
  it("does not move the current screen, however long it stays", () => {
    const state = reduceSelection(initialScreenState("A"), plugin("B"), 0);

    expect(state).toEqual({ current: "A", pending: null });
    expect(settleScreen(state, 10000).current).toBe("A");
  });

  it("does not start, clear or advance a waiting screen", () => {
    const waiting = reduceSelection(initialScreenState("A"), designer("B"), 0);

    expect(reduceSelection(waiting, plugin("C"), 100)).toEqual(waiting);
    expect(reduceSelection(waiting, plugin(), 100)).toEqual(waiting);
    expect(reduceSelection(waiting, plugin("A"), 100)).toEqual(waiting);
  });

  it("does not apply a matured waiting screen early", () => {
    const waiting = reduceSelection(initialScreenState("A"), designer("B"), 0);

    expect(reduceSelection(waiting, plugin("C"), SCREEN_DWELL_MS + 50)).toEqual(waiting);
  });
});

describe("msUntilSettle", () => {
  it("is null with nothing waiting and counts down otherwise", () => {
    expect(msUntilSettle(initialScreenState("A"), 0)).toBeNull();
    const waiting = reduceSelection(initialScreenState("A"), designer("B"), 1000);

    expect(msUntilSettle(waiting, 1000)).toBe(SCREEN_DWELL_MS);
    expect(msUntilSettle(waiting, 1400)).toBe(200);
    expect(msUntilSettle(waiting, 9000)).toBe(0);
  });
});

describe("the tracker with an injected clock", () => {
  function tracker(launch: string | null = "A") {
    let now = 0;
    const clock = () => now;
    return { t: createScreenTracker(clock, launch), at: (ms: number) => (now = ms) };
  }

  it("suppresses three quick screen changes, then settles on the last", () => {
    const { t, at } = tracker();
    at(0);
    t.onSelection(designer("B"));
    at(150);
    t.onSelection(designer("C"));
    at(300);
    t.onSelection(designer("D"));
    at(500);
    t.settle();

    expect(t.currentScreenId()).toBe("A");
    at(300 + SCREEN_DWELL_MS - 1);
    t.settle();
    expect(t.currentScreenId()).toBe("A");
    at(300 + SCREEN_DWELL_MS);
    t.settle();
    expect(t.currentScreenId()).toBe("D");
  });

  it("never lets an earlier screen win when the last change was quick", () => {
    const { t, at } = tracker();
    at(0);
    t.onSelection(designer("B"));
    at(550);
    t.onSelection(designer("C"));
    at(1100);
    t.settle();

    expect(t.currentScreenId()).toBe("A");
    expect(t.msUntilSettle()).toBe(50);
  });

  it("is not moved by a plugin selection", () => {
    const { t, at } = tracker();
    at(0);
    t.onSelection(plugin("B"));
    at(5000);
    t.settle();

    expect(t.currentScreenId()).toBe("A");
  });

  it("clears and chooses again on a page change", () => {
    const { t, at } = tracker();
    at(0);
    t.onSelection(designer("B"));
    t.reset("Z");

    expect(t.currentScreenId()).toBe("Z");
    expect(t.msUntilSettle()).toBeNull();
    at(5000);
    t.settle();
    expect(t.currentScreenId()).toBe("Z");
  });
});
