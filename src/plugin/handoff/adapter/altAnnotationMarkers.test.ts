import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DECORATIVE_ANNOTATION_TEXT } from "../../../shared/handoff/alt/annotationText";
import type { Marker } from "../../../shared/markers/markerSet";
import { isCadtMarker, type MarkerScope } from "../../markers/adapter/isCadtMarker";
import { createMarkerRenderer } from "../../markers/adapter/markerRenderer";
import type { FakeNode } from "../../markers/adapter/markerFigmaStub";
import { annotateNode } from "./annotationActions";
import { altNote, giveNote, installFake, labelsOf } from "./annotationHarness";

const DESIGNER: Annotation = { label: "Keep the corners square" };
const marker: Marker = {
  signature: "r1",
  screenId: "A",
  issueId: "contrast:1:1",
  nodeId: "1:1",
  label: "2.2"
};
const ALT_TEXT = "A cafe sign";

let fake: ReturnType<typeof installFake>;
let node: FakeNode;
const altId = () => fake.categories.find((c) => c.label === "Alt text")?.id;
const cadt = () => fake.categories.find((c) => c.label === "CADT");
const altOnLayer = () => node.annotations.filter((a) => a.label === ALT_TEXT);
const scope = (): MarkerScope => ({
  userId: "u1",
  sessionId: null,
  categoryId: cadt()?.id ?? null,
  existingCategoryIds: new Set(fake.categories.map((c) => c.id))
});

/** One layer that carries a designer's note, our alt annotation and a CADT marker */
async function layerWithBoth() {
  const renderer = createMarkerRenderer("s1");
  await annotateNode("1:1");
  await renderer.show("A", [marker]);
  return renderer;
}

beforeEach(async () => {
  fake = installFake();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  node = fake.addNode("1:1", [DESIGNER]);
  giveNote(node, altNote(ALT_TEXT));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the marker test never matches an alt annotation", () => {
  it("not in its own category, not with no category left, not with a category that is gone", async () => {
    await layerWithBoth();
    const [alt] = altOnLayer();
    expect(alt.categoryId).toBe(altId());
    expect(isCadtMarker(alt, node, scope())).toBe(false);
    expect(isCadtMarker({ label: ALT_TEXT }, node, scope())).toBe(false);
    expect(isCadtMarker({ label: ALT_TEXT, categoryId: "gone" }, node, scope())).toBe(false);
    expect(isCadtMarker({ label: DECORATIVE_ANNOTATION_TEXT }, node, scope())).toBe(false);
    const ours = node.annotations.find((a) => a.categoryId === cadt()?.id) as Annotation;
    expect(isCadtMarker(ours, node, scope())).toBe(true);
  });
});

describe("the marker code leaves the Alt text category alone", () => {
  it("a screen swap and removing the markers keep the alt annotation and the designer's own", async () => {
    const renderer = await layerWithBoth();
    await renderer.show("B", []);
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT]);
    await renderer.show("A", [marker]);
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT, ""]);
  });

  it("the read-back repair puts a marker back and replaces a drifted one without touching the alt annotation", async () => {
    const renderer = await layerWithBoth();
    node.annotations = node.annotations.filter((a) => a.categoryId !== cadt()?.id);
    await renderer.show("A", [marker]);
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT, ""]);
    const [alt] = altOnLayer();
    expect(alt.categoryId).toBe(altId());
  });

  it("close removes the marker and the CADT category, and keeps the alt annotation and its category", async () => {
    const renderer = await layerWithBoth();
    const alt = altOnLayer()[0];
    renderer.clearSync();
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT]);
    expect(altOnLayer()[0]).toBe(alt);
    expect(altId()).toBeDefined();
    expect(cadt()).toBeUndefined();
  });

  it("an undo that brings annotations back with no category still keeps the alt annotation on close", async () => {
    const renderer = await layerWithBoth();
    node.annotations = node.annotations.map(({ label }) => ({ label }));
    renderer.clearSync();
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT]);
  });

  it("an undo that leaves a category id that no longer exists still keeps it on close", async () => {
    const renderer = await layerWithBoth();
    node.annotations = node.annotations.map(({ label }) => ({ label, categoryId: "cat:gone" }));
    renderer.clearSync();
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT]);
  });

  it("the launch sweep of an earlier session removes its marker and keeps the alt annotation", async () => {
    await layerWithBoth();
    const next = createMarkerRenderer("s2");
    await next.sweepOrphans();
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT]);
    expect(altOnLayer()[0].categoryId).toBe(altId());
  });

  it("the sweep keeps it after an undo took the categories off", async () => {
    await layerWithBoth();
    node.annotations = node.annotations.map(({ label }) => ({ label }));
    await createMarkerRenderer("s2").sweepOrphans();
    expect(labelsOf(node)).toEqual(["Keep the corners square", ALT_TEXT]);
  });
});
