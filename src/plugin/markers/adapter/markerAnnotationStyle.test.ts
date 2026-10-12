import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Marker } from "../../../shared/markers/markerSet";
import { MARKER_TAG_KEY, parseTag } from "./markerTags";
import { createMarkerRenderer } from "./markerRenderer";
import { createFakeFigma, tag, type FakeNode } from "./markerFigmaStub";

const marker = (nodeId: string): Marker => ({
  signature: `r:${nodeId}`,
  screenId: "A",
  issueId: `contrast:${nodeId}`,
  nodeId,
  label: "2.2"
});

let fake: ReturnType<typeof createFakeFigma>;
let info: ReturnType<typeof vi.spyOn>;

function setup(options: Parameters<typeof createFakeFigma>[0] = {}) {
  fake = createFakeFigma(options);
  fake.install();
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  info = vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("an annotation with no text", () => {
  it("is written with the category and no label at all", async () => {
    setup();
    const node = fake.addNode("1:1");
    await createMarkerRenderer("s1").show("A", [marker("1:1")], "annotation");

    expect(node.annotations).toEqual([{ categoryId: fake.categories[0]?.id }]);
    expect("label" in (node.annotations[0] as object)).toBe(false);
    expect(info).not.toHaveBeenCalled();
  });

  it("records the empty label on the layer's tag", async () => {
    setup();
    const node = fake.addNode("1:1");
    await createMarkerRenderer("s1").show("A", [marker("1:1")], "annotation");

    expect(parseTag(node.getPluginData(MARKER_TAG_KEY))?.label).toBe("");
  });

  it("falls back to a single dot when Figma refuses an empty label, and notes it once", async () => {
    setup({ rejectEmptyLabel: true });
    const a = fake.addNode("1:1");
    const b = fake.addNode("1:2");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("1:1")], "annotation");
    await renderer.show("A", [marker("1:1"), marker("1:2")], "annotation");

    expect(a.annotations).toEqual([{ label: ".", categoryId: fake.categories[0]?.id }]);
    expect(b.annotations).toEqual([{ label: ".", categoryId: fake.categories[0]?.id }]);
    expect(parseTag(a.getPluginData(MARKER_TAG_KEY))?.label).toBe(".");
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("does not mistake the fallback for a refused write, so markers still appear", async () => {
    setup({ rejectEmptyLabel: true });
    fake.addNode("1:1");
    const result = await createMarkerRenderer("s1").show("A", [marker("1:1")], "annotation");

    expect(result).toEqual({ written: true });
  });

  it("settles after the fallback, writing nothing more", async () => {
    setup({ rejectEmptyLabel: true });
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("1:1")], "annotation");
    fake.calls.length = 0;
    await renderer.show("A", [marker("1:1")], "annotation");

    expect(fake.calls).toEqual([]);
  });

  it.each([
    ["an empty label", ""],
    ["the fallback dot", "."]
  ])("is still ours after an undo restores it with no category and %s", async (_name, recorded) => {
    setup();
    const node = fake.addNode("1:1", [{ label: "Mine" }], tag("u1", "s1", { label: recorded }));
    node.annotations = [{ label: "Mine" }, recorded === "" ? {} : { label: recorded }];
    createMarkerRenderer("s1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("1:1")], "annotation");
    renderer.clearSync();

    expect(node.annotations).toEqual([{ label: "Mine" }]);
  });

  it("is removed by the launch sweep too, and by any other user's session never", async () => {
    setup();
    const mine = fake.addNode("1:1", [{ label: "Mine" }, {}], tag("u1", "old", { label: "" }));
    const theirs = fake.addNode("2:1", [{}], tag("u2", "old", { label: "" }));
    await createMarkerRenderer("s2").sweepOrphans();

    expect(mine.annotations).toEqual([{ label: "Mine" }]);
    expect(theirs.annotations).toEqual([{}]);
  });

  it("has one unavoidable false match, a designer's annotation with no label and no category on a tagged layer", async () => {
    setup();
    const node: FakeNode = fake.addNode("1:1", [], tag("u1", "s1", { label: "" }));
    node.annotations = [{ label: "Mine" }, {}];
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("1:1")], "annotation");
    renderer.clearSync();

    // The empty one is taken for ours, which cannot be told apart, the labelled one survives
    expect(node.annotations).toEqual([{ label: "Mine" }]);
  });

  it("never touches an annotation that has text, in another category, or on an untagged layer", async () => {
    setup();
    const tagged = fake.addNode(
      "1:1",
      [{ label: "Text" }, { label: "Cat", categoryId: "theirs" }],
      tag("u1", "s1", { label: "" })
    );
    const plain = fake.addNode("2:1", [{}]);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("B", [], "annotation");
    renderer.clearSync();
    await createMarkerRenderer("s9").sweepOrphans();

    expect(tagged.annotations).toEqual([{ label: "Text" }, { label: "Cat", categoryId: "theirs" }]);
    expect(plain.annotations).toEqual([{}]);
  });
});
