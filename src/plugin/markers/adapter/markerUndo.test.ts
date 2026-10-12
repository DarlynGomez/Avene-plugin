import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Marker } from "../../../shared/markers/markerSet";
import { createMarkerRenderer } from "./markerRenderer";
import { createFakeFigma, type FakeNode } from "./markerFigmaStub";

const marker = (signature: string, screenId: string, nodeId: string, label = "2.2"): Marker => ({
  signature,
  screenId,
  issueId: `contrast:${nodeId}`,
  nodeId,
  label
});

const DESIGNER_NOTE: Annotation = { label: "Spacing is intentional here" };

let fake: ReturnType<typeof createFakeFigma>;

beforeEach(() => {
  fake = createFakeFigma();
  fake.install();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const labels = (node: FakeNode) => node.annotations.map((annotation) => annotation.label ?? "");
const snapshot = (nodes: FakeNode[]) => nodes.map((node) => [...node.annotations]);

/** What an undo leaves: the annotations as they were, but without any category */
function undoTo(nodes: FakeNode[], before: Annotation[][], strip: (a: Annotation) => Annotation) {
  nodes.forEach((node, index) => {
    node.annotations = (before[index] ?? []).map(strip);
  });
  fake.calls.length = 0;
}

describe("undo restores annotations whose category is gone", () => {
  it("removes them on close when they come back with no category at all", async () => {
    const node = fake.addNode("1:1", [DESIGNER_NOTE]);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const withMarker = snapshot([node]);
    await renderer.show("A", []);
    undoTo([node], withMarker, ({ label }) => ({ label }));

    expect(labels(node)).toEqual(["Spacing is intentional here", ""]);
    renderer.clearSync();

    expect(labels(node)).toEqual(["Spacing is intentional here"]);
  });

  it("removes them on close when they come back with an id for a category that no longer exists", async () => {
    const node = fake.addNode("1:1", [DESIGNER_NOTE]);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const withMarker = snapshot([node]);
    await renderer.show("A", []);
    fake.categories.length = 0;
    undoTo([node], withMarker, (annotation) => annotation);

    renderer.clearSync();

    expect(labels(node)).toEqual(["Spacing is intentional here"]);
  });

  it("removes them at the next launch's sweep too", async () => {
    const node = fake.addNode("1:1", [DESIGNER_NOTE]);
    const first = createMarkerRenderer("s1");
    await first.show("A", [marker("r1", "A", "1:1")]);
    const withMarker = snapshot([node]);
    await first.show("A", []);
    fake.categories.length = 0;
    undoTo([node], withMarker, ({ label }) => ({ label }));

    await createMarkerRenderer("s2").sweepOrphans();

    expect(labels(node)).toEqual(["Spacing is intentional here"]);
  });

  it("recovers after an undo of a screen swap, then closes clean", async () => {
    const a = fake.addNode("1:1", [DESIGNER_NOTE]);
    const b = fake.addNode("2:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const onA = snapshot([a, b]);
    await renderer.show("B", [marker("r2", "B", "2:1")]);
    undoTo([a, b], onA, (annotation) => annotation);

    await renderer.show("B", [marker("r2", "B", "2:1")]);
    expect(labels(a)).toEqual(["Spacing is intentional here"]);
    expect(labels(b)).toEqual([""]);

    renderer.clearSync();
    expect(labels(a)).toEqual(["Spacing is intentional here"]);
    expect(labels(b)).toEqual([]);
  });

  it("never removes a designer's own annotation in any of these cases", async () => {
    const node = fake.addNode("1:1", [DESIGNER_NOTE, { label: "Other", categoryId: "theirs" }]);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const withMarker = snapshot([node]);
    await renderer.show("A", []);
    undoTo([node], withMarker, ({ label }) => ({ label }));
    renderer.clearSync();

    expect(labels(node)).toContain("Spacing is intentional here");
    expect(labels(node)).toContain("Other");
  });
});

describe("the category and the tag during a session", () => {
  it("keeps the category after the last marker is removed, until close", async () => {
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    await renderer.show("A", []);

    expect(fake.categories).toHaveLength(1);
    renderer.clearSync();
    expect(fake.categories).toHaveLength(0);
  });

  it("recreates a missing category when a marker is written", async () => {
    fake.addNode("1:1");
    fake.addNode("1:2");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    fake.categories.length = 0;
    await renderer.show("A", [marker("r1", "A", "1:1"), marker("r2", "A", "1:2")]);

    expect(fake.categories).toHaveLength(1);
    expect(fake.nodes.get("1:2")?.annotations[0]?.categoryId).toBe(fake.categories[0]?.id);
  });

  it("keeps a layer's tag when its marker is removed, and clears it at close", async () => {
    const node = fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    await renderer.show("A", []);

    expect(node.getPluginData("cadt.marker.v1")).not.toBe("");
    renderer.clearSync();
    expect(node.getPluginData("cadt.marker.v1")).toBe("");
  });
});

describe("reconciling against the canvas, not memory", () => {
  it("puts back a marker that was removed from the canvas behind its back", async () => {
    const node = fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    node.annotations = [];
    await renderer.show("A", [marker("r1", "A", "1:1")]);

    expect(labels(node)).toEqual([""]);
  });

  it("replaces a marker whose label drifted and removes a duplicate", async () => {
    const node = fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const category = fake.categories[0]?.id;
    node.annotations = [{ label: "9.9", categoryId: category }, { categoryId: category }];
    await renderer.show("A", [marker("r1", "A", "1:1")]);

    expect(labels(node)).toEqual([""]);
  });

  it("makes no write when the canvas already matches", async () => {
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    fake.calls.length = 0;
    await renderer.show("A", [marker("r1", "A", "1:1")]);

    expect(fake.calls).toEqual([]);
  });
});
