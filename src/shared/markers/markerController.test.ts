import { describe, expect, it, vi } from "vitest";

import type { MarkerStateChange } from "../study/studyEvents";
import { SCREEN_DWELL_MS } from "./currentScreen";
import { createMarkerController } from "./markerController";
import { instance, root } from "./markerFixtures";
import type { MarkerRenderer, ShowResult } from "./markerRenderer";
import type { Marker } from "./markerSet";

function setup(options: { visible?: boolean; launch?: string | null } = {}) {
  let now = 0;
  let visible = options.visible ?? true;
  let launch = options.launch === undefined ? "A" : options.launch;
  const shows: { screen: string; nodes: string[] }[] = [];
  const events: [MarkerStateChange, number][] = [];
  const notices: string[] = [];
  const timers = new Map<number, { at: number; callback: () => void }>();
  let nextTimer = 1;
  let result: ShowResult = { written: true };
  const renderer: MarkerRenderer = {
    show: vi.fn(async (screen: string, markers: readonly Marker[]) => {
      shows.push({ screen, nodes: markers.map((marker) => marker.nodeId) });
      return result;
    }),
    clear: vi.fn(async () => undefined),
    clearSync: vi.fn(),
    sweepOrphans: vi.fn(async () => ({ cleaned: 0, left: 0 }))
  };
  const controller = createMarkerController({
    renderer,
    clock: () => now,
    schedule: (callback, ms) => {
      const id = nextTimer++;
      timers.set(id, { at: now + ms, callback });
      return id;
    },
    cancel: (handle) => void timers.delete(handle as number),
    isVisible: () => visible,
    launchScreenId: () => launch,
    onNotice: (message) => notices.push(message),
    onStateChange: (change, count) => events.push([change, count])
  });
  return {
    controller,
    renderer,
    shows,
    events,
    notices,
    timers,
    setVisible: (value: boolean) => (visible = value),
    setLaunch: (value: string | null) => (launch = value),
    setResult: (value: ShowResult) => (result = value),
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    }
  };
}

const designer = (...screenIds: string[]) => ({ origin: "designer" as const, screenIds });
const plugin = (...screenIds: string[]) => ({ origin: "plugin" as const, screenIds });

const ROOTS = [
  root("r1", [instance("1:1", "A", "open", 0), instance("2:1", "B", "open", 1)]),
  root("r2", [instance("3:1", "B", "open", 2)])
];

describe("showing markers", () => {
  it("draws the launch screen's markers when the issue list arrives, and says so once", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();

    expect(t.shows.at(-1)).toEqual({ screen: "A", nodes: ["1:1"] });
    expect(t.events).toEqual([["shown", 1]]);
  });

  it("follows each issue list update", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    t.controller.onRoots(
      [ROOTS[0] as (typeof ROOTS)[number]].map((r) => ({ ...r, instances: [] }))
    );
    await t.controller.idle();

    expect(t.shows.at(-1)).toEqual({ screen: "A", nodes: [] });
  });

  it("takes a deferred root's marker away as soon as the list says it is deferred", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    t.controller.onRoots([
      root("r1", [instance("1:1", "A", "deferred", 0)], "deferred"),
      ROOTS[1] as (typeof ROOTS)[number]
    ]);
    await t.controller.idle();

    expect(t.shows.at(-1)?.nodes).toEqual([]);
  });

  it("writes nothing when no screen is known yet, then draws once one settles", async () => {
    const t = setup({ launch: null });
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    expect(t.shows.at(-1)).toEqual({ screen: "", nodes: [] });

    t.controller.onSelection(designer("B"), ["2:1"]);
    t.advance(SCREEN_DWELL_MS);
    await t.controller.idle();
    expect(t.shows.at(-1)).toEqual({ screen: "B", nodes: ["2:1", "3:1"] });
  });
});

describe("moving to another screen", () => {
  it("waits out the dwell before the markers move, and reports the change without a screen", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    t.controller.onSelection(designer("B"), ["2:1"]);
    await t.controller.idle();

    expect(t.shows.at(-1)?.screen).toBe("A");
    t.advance(SCREEN_DWELL_MS - 1);
    await t.controller.idle();
    expect(t.shows.at(-1)?.screen).toBe("A");
    t.advance(1);
    await t.controller.idle();
    expect(t.shows.at(-1)).toEqual({ screen: "B", nodes: ["2:1", "3:1"] });
    expect(t.events.at(-1)).toEqual(["screen_changed", 2]);
  });

  it("makes no write for three quick changes, only for where the designer settles", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    const before = t.shows.length;
    t.controller.onSelection(designer("B"), ["2:1"]);
    t.advance(100);
    t.controller.onSelection(designer("C"), ["9:9"]);
    t.advance(100);
    t.controller.onSelection(designer("B"), ["3:1"]);
    await t.controller.idle();

    expect(new Set(t.shows.slice(before).map((show) => show.screen))).toEqual(new Set(["A"]));
    t.advance(SCREEN_DWELL_MS);
    await t.controller.idle();
    expect(t.shows.at(-1)?.screen).toBe("B");
    expect(t.timers.size).toBe(0);
  });

  it("is not moved by a selection the plugin made", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    const before = t.shows.length;
    t.controller.onSelection(plugin("B"), ["2:1"]);
    t.advance(5000);
    await t.controller.idle();

    expect(t.shows).toHaveLength(before);
    expect(t.timers.size).toBe(0);
    expect(t.controller.currentScreenId()).toBe("A");
  });

  it("keeps the screen when the designer deselects", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    t.controller.onSelection(designer(), []);
    t.advance(5000);
    await t.controller.idle();

    expect(t.controller.currentScreenId()).toBe("A");
  });

  it("chooses again on a page change, clearing first", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    t.setLaunch("B");
    t.controller.onPageChange();
    await t.controller.idle();

    expect(t.renderer.clear).toHaveBeenCalled();
    expect(t.controller.currentScreenId()).toBe("B");
    expect(t.shows.at(-1)?.screen).toBe("B");
  });
});

describe("what the participant may see", () => {
  it("shows nothing while hidden, never writing, and clears once when it turns off", async () => {
    const t = setup({ visible: false });
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    expect(t.shows).toEqual([]);
    expect(t.renderer.clear).not.toHaveBeenCalled();

    t.setVisible(true);
    await t.controller.refreshVisibility();
    expect(t.events).toEqual([["shown", 1]]);
    t.setVisible(false);
    await t.controller.refreshVisibility();
    await t.controller.refreshVisibility();

    expect(t.renderer.clear).toHaveBeenCalledTimes(1);
    expect(t.events).toEqual([
      ["shown", 1],
      ["hidden", 0]
    ]);
  });

  it("does not draw for a selection or an update while hidden", async () => {
    const t = setup({ visible: false });
    t.controller.onSelection(designer("B"), ["2:1"]);
    t.advance(SCREEN_DWELL_MS);
    t.controller.onRoots(ROOTS);
    await t.controller.idle();

    expect(t.shows).toEqual([]);
  });

  it("comes back with the markers when feedback is revealed", async () => {
    const t = setup({ visible: false });
    t.controller.onRoots(ROOTS);
    t.setVisible(true);
    await t.controller.refreshVisibility();

    expect(t.shows.at(-1)).toEqual({ screen: "A", nodes: ["1:1"] });
  });
});

describe("failures and lookups", () => {
  it("passes a notice on and records no state change when nothing was written", async () => {
    const t = setup();
    t.setResult({ written: false, reason: "read_only", notice: "View only" });
    t.controller.onRoots(ROOTS);
    await t.controller.idle();

    expect(t.notices).toEqual(["View only"]);
    expect(t.events).toEqual([]);
  });

  it("keeps working after a renderer failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const t = setup();
    (t.renderer.show as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));
    t.controller.onRoots(ROOTS);
    await t.controller.idle();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();

    expect(t.shows.at(-1)).toEqual({ screen: "A", nodes: ["1:1"] });
    vi.restoreAllMocks();
  });

  it("finds the marker on a layer so the panel can scroll to its root", async () => {
    const t = setup();
    t.controller.onRoots(ROOTS);
    await t.controller.idle();

    expect(t.controller.markerForNode("1:1")?.signature).toBe("r1");
    expect(t.controller.markerForNode("9:9")).toBeUndefined();
  });

  it("uses the dwell constant of 600 milliseconds", () => {
    expect(setup().controller.dwellMs).toBe(600);
  });
});
