import { describe, expect, it } from "vitest";

import { diffMarkers } from "./markerDiff";
import type { Marker } from "./markerSet";

const marker = (signature: string, screenId: string, nodeId: string, label = "L"): Marker => ({
  signature,
  screenId,
  issueId: `contrast:${nodeId}`,
  nodeId,
  label
});

describe("diffMarkers", () => {
  it("is empty for two empty sets", () => {
    expect(diffMarkers([], [])).toEqual({ added: [], removed: [], unchanged: [] });
  });

  it("adds every marker when there were none", () => {
    const next = [marker("r1", "A", "1:1"), marker("r2", "A", "1:2")];

    expect(diffMarkers([], next)).toEqual({ added: next, removed: [], unchanged: [] });
  });

  it("removes every marker when none remain", () => {
    const old = [marker("r1", "A", "1:1")];

    expect(diffMarkers(old, [])).toEqual({ added: [], removed: old, unchanged: [] });
  });

  it("leaves an identical marker alone", () => {
    const same = [marker("r1", "A", "1:1")];

    expect(diffMarkers(same, [...same])).toEqual({ added: [], removed: [], unchanged: same });
  });

  it("reports only what changed", () => {
    const keep = marker("r1", "A", "1:1");
    const gone = marker("r2", "A", "1:2");
    const fresh = marker("r3", "A", "1:3");
    const diff = diffMarkers([keep, gone], [keep, fresh]);

    expect(diff.added).toEqual([fresh]);
    expect(diff.removed).toEqual([gone]);
    expect(diff.unchanged).toEqual([keep]);
  });

  it("moves a marker by removing it from the old layer and adding it to the new one", () => {
    const old = marker("r1", "A", "1:1");
    const moved = marker("r1", "A", "1:2");
    const diff = diffMarkers([old], [moved]);

    expect(diff.removed).toEqual([old]);
    expect(diff.added).toEqual([moved]);
    expect(diff.unchanged).toEqual([]);
  });

  it("rewrites a marker whose label changed", () => {
    const old = marker("r1", "A", "1:1", "Contrast 2.17, needs 4.5");
    const next = marker("r1", "A", "1:1", "Contrast 2.17, needs 4.5. 2 layers here");
    const diff = diffMarkers([old], [next]);

    expect(diff.removed).toEqual([old]);
    expect(diff.added).toEqual([next]);
  });

  it("treats the same root on another screen as a different marker", () => {
    const onA = marker("r1", "A", "1:1");
    const onB = marker("r1", "B", "2:1");
    const diff = diffMarkers([onA], [onB]);

    expect(diff.removed).toEqual([onA]);
    expect(diff.added).toEqual([onB]);
  });

  it("does not mutate either set", () => {
    const old = [marker("r1", "A", "1:1")];
    const next = [marker("r2", "A", "1:2")];
    diffMarkers(old, next);

    expect(old).toEqual([marker("r1", "A", "1:1")]);
    expect(next).toEqual([marker("r2", "A", "1:2")]);
  });
});
