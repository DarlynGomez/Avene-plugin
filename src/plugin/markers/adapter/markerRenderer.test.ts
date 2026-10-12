import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Marker } from "../../../shared/markers/markerSet";
import { registerMarkerCloseClear } from "../../lifecycle/markerLifecycle";
import { createMarkerRenderer, NO_USER_NOTICE, READ_ONLY_NOTICE } from "./markerRenderer";
import { createFakeFigma, tag } from "./markerFigmaStub";

const marker = (signature: string, screenId: string, nodeId: string, label = "L"): Marker => ({
  signature,
  screenId,
  issueId: `contrast:${nodeId}`,
  nodeId,
  label
});

const DESIGNER_NOTE: Annotation = { label: "Spacing is intentional here" };

let fake: ReturnType<typeof createFakeFigma>;

function setup(options: Parameters<typeof createFakeFigma>[0] = {}) {
  fake = createFakeFigma(options);
  fake.install();
  return fake;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const labels = (id: string) => fake.nodes.get(id)?.annotations.map((a) => a.label);

describe("the CADT category", () => {
  it("does not exist until the first marker is written, then is created once", async () => {
    setup();
    fake.addNode("1:1");
    fake.addNode("1:2");
    const renderer = createMarkerRenderer("s1");

    expect(fake.categories).toHaveLength(0);
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    await renderer.show("A", [marker("r1", "A", "1:1"), marker("r2", "A", "1:2")]);

    expect(fake.categories).toHaveLength(1);
    expect(fake.categories[0]).toMatchObject({ label: "CADT", color: "red" });
    expect(fake.calls.filter((call) => call === "category:add")).toHaveLength(1);
  });

  it("is removed when the last of this user's markers goes", async () => {
    setup();
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    await renderer.show("A", []);

    expect(fake.categories).toHaveLength(0);
  });

  it("stays while another user's CADT markers still use it", async () => {
    setup();
    const category = fake.addCategory("CADT");
    fake.addNode("9:9", [{ label: "theirs", categoryId: category.id }], tag("other", "x"));
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    await renderer.show("A", []);

    expect(fake.categories).toHaveLength(1);
    expect(labels("9:9")).toEqual(["theirs"]);
  });

  it("is reused when it already exists, not created twice", async () => {
    setup();
    fake.addCategory("CADT");
    fake.addNode("1:1");
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")]);

    expect(fake.categories).toHaveLength(1);
    expect(fake.calls).not.toContain("category:add");
  });

  it("is removed on a synchronous close when nothing else uses it", async () => {
    setup();
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    renderer.clearSync();

    expect(fake.categories).toHaveLength(0);
  });
});

describe("ownership", () => {
  it("tags each annotated layer with the user and the session", async () => {
    setup({ userId: "u7" });
    const node = fake.addNode("1:1");
    await createMarkerRenderer("sess-9").show("A", [marker("r1", "A", "1:1", "Contrast 2.17")]);

    expect(JSON.parse(node.getPluginData("cadt.marker.v1"))).toEqual({
      userId: "u7",
      sessionId: "sess-9"
    });
    expect(labels("1:1")).toEqual(["Contrast 2.17"]);
    expect(node.annotations[0]?.categoryId).toBe(fake.categories[0]?.id);
  });

  it("skips a layer tagged by another user and says nothing is written there", async () => {
    setup();
    const node = fake.addNode("1:1", [], tag("other", "x"));
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")]);

    expect(node.annotations).toEqual([]);
    expect(node.getPluginData("cadt.marker.v1")).toBe(tag("other", "x"));
  });

  it("skips something that cannot hold annotations", async () => {
    setup();
    const result = await createMarkerRenderer("s1").show("A", [marker("r1", "A", "missing")]);

    expect(result).toEqual({ written: true });
    expect(fake.calls).not.toContain("annotations:missing");
  });

  it("removes only what this session wrote, never another session of the same user", async () => {
    setup();
    const earlier = fake.addNode("2:2", [{ label: "old", categoryId: "x" }], tag("u1", "earlier"));
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("now");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    renderer.clearSync();

    expect(labels("1:1")).toEqual([]);
    expect(earlier.annotations).toHaveLength(1);
  });
});

describe("a designer's own annotations", () => {
  it("survive a write, a swap to another layer and a close", async () => {
    setup();
    const other: Annotation = { label: "Check with Sam", categoryId: "designer-category" };
    fake.addNode("1:1", [DESIGNER_NOTE]);
    fake.addNode("1:2", [other, { label: "Second note" }]);
    const renderer = createMarkerRenderer("s1");

    await renderer.show("A", [marker("r1", "A", "1:1")]);
    expect(labels("1:1")).toEqual(["Spacing is intentional here", "L"]);

    await renderer.show("A", [marker("r1", "A", "1:2")]);
    expect(labels("1:1")).toEqual(["Spacing is intentional here"]);
    expect(labels("1:2")).toEqual(["Check with Sam", "Second note", "L"]);

    await renderer.show("B", []);
    expect(labels("1:2")).toEqual(["Check with Sam", "Second note"]);

    await renderer.show("A", [marker("r1", "A", "1:1")]);
    renderer.clearSync();
    expect(labels("1:1")).toEqual(["Spacing is intentional here"]);
    expect(labels("1:2")).toEqual(["Check with Sam", "Second note"]);
  });

  it("are appended to, never replaced, when a marker is written", async () => {
    setup();
    const node = fake.addNode("1:1", [DESIGNER_NOTE]);
    await createMarkerRenderer("s1").show("A", [marker("r1", "A", "1:1")]);

    expect(node.annotations[0]).toBe(DESIGNER_NOTE);
    expect(node.annotations).toHaveLength(2);
  });

  it("survive the orphan sweep on a layer that also carried an old marker", async () => {
    setup();
    const category = fake.addCategory("CADT");
    const node = fake.addNode(
      "1:1",
      [DESIGNER_NOTE, { label: "old marker", categoryId: category.id }],
      tag("u1", "crashed")
    );
    await createMarkerRenderer("s1").sweepOrphans();

    expect(node.annotations).toEqual([DESIGNER_NOTE]);
  });
});

describe("live references and the synchronous close", () => {
  it("removes every marker the instant clearSync is called, without waiting", async () => {
    setup();
    for (const id of ["1:1", "1:2", "1:3"]) fake.addNode(id);
    const renderer = createMarkerRenderer("s1");
    await renderer.show(
      "A",
      ["1:1", "1:2", "1:3"].map((id) => marker(id, "A", id))
    );
    renderer.clearSync();

    for (const id of ["1:1", "1:2", "1:3"]) {
      expect(labels(id)).toEqual([]);
      expect(fake.nodes.get(id)?.getPluginData("cadt.marker.v1")).toBe("");
    }
  });

  it("is wired to the close event", async () => {
    setup();
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    registerMarkerCloseClear(renderer);
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    fake.runCloseHandlers();

    expect(labels("1:1")).toEqual([]);
  });

  it("does nothing on close when nothing was written", () => {
    setup();
    const renderer = createMarkerRenderer("s1");

    expect(() => renderer.clearSync()).not.toThrow();
    expect(fake.calls).toEqual([]);
  });
});

describe("the orphan sweep", () => {
  it("removes this user's markers from earlier sessions and leaves other users alone", async () => {
    setup();
    const category = fake.addCategory("CADT");
    const mine = fake.addNode("1:1", [{ label: "m", categoryId: category.id }], tag("u1", "old"));
    const theirs = fake.addNode("2:2", [{ label: "t", categoryId: category.id }], tag("u2", "old"));
    const result = await createMarkerRenderer("now").sweepOrphans();

    expect(mine.annotations).toEqual([]);
    expect(mine.getPluginData("cadt.marker.v1")).toBe("");
    expect(theirs.annotations).toHaveLength(1);
    expect(result).toEqual({ cleaned: 1, left: 1 });
    expect(fake.categories).toHaveLength(1);
  });

  it("strips a copy of a tagged layer that is not in the live set, but keeps live ones", async () => {
    setup();
    fake.addNode("1:1");
    fake.addNode("1:2");
    const renderer = createMarkerRenderer("now");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const category = fake.categories[0] as { id: string };
    const copy = fake.addNode("9:1", [{ label: "L", categoryId: category.id }], tag("u1", "now"));
    const result = await renderer.sweepOrphans();

    expect(copy.annotations).toEqual([]);
    expect(labels("1:1")).toEqual(["L"]);
    expect(result.cleaned).toBe(1);
  });

  it("runs before the first write, whatever the caller does", async () => {
    setup();
    const category = fake.addCategory("CADT");
    fake.addNode("2:2", [{ label: "old", categoryId: category.id }], tag("u1", "old"));
    fake.addNode("1:1");
    await createMarkerRenderer("now").show("A", [marker("r1", "A", "1:1")]);

    expect(fake.calls.indexOf("annotations:2:2")).toBeGreaterThanOrEqual(0);
    expect(fake.calls.indexOf("annotations:2:2")).toBeLessThan(
      fake.calls.indexOf("annotations:1:1")
    );
  });

  it("runs only once", async () => {
    setup();
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("now");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const late = fake.addNode("5:5", [], tag("u1", "later-crash"));
    await renderer.show("A", [marker("r1", "A", "1:1", "changed")]);

    expect(late.getPluginData("cadt.marker.v1")).toBe(tag("u1", "later-crash"));
  });

  it("leaves a tag it cannot read alone", async () => {
    setup();
    const node = fake.addNode("1:1", [], "{broken");
    const result = await createMarkerRenderer("now").sweepOrphans();

    expect(node.getPluginData("cadt.marker.v1")).toBe("{broken");
    expect(result).toEqual({ cleaned: 0, left: 1 });
  });
});

describe("one undo step per swap", () => {
  it("commits once for a write, once for a screen swap, and not at all for no change", async () => {
    setup();
    for (const id of ["1:1", "1:2", "1:3", "2:1", "2:2"]) fake.addNode(id);
    const renderer = createMarkerRenderer("s1");

    await renderer.show(
      "A",
      ["1:1", "1:2", "1:3"].map((id) => marker(id, "A", id))
    );
    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
    await renderer.show(
      "A",
      ["1:1", "1:2", "1:3"].map((id) => marker(id, "A", id))
    );
    expect(fake.commitUndo).toHaveBeenCalledTimes(1);
    await renderer.show(
      "B",
      ["2:1", "2:2"].map((id) => marker(id, "B", id))
    );
    expect(fake.commitUndo).toHaveBeenCalledTimes(2);
    await renderer.clear();
    expect(fake.commitUndo).toHaveBeenCalledTimes(3);
  });

  it("writes only the difference on an update", async () => {
    setup();
    for (const id of ["1:1", "1:2"]) fake.addNode(id);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    fake.calls.length = 0;
    await renderer.show("A", [marker("r1", "A", "1:1"), marker("r2", "A", "1:2")]);

    expect(fake.calls.filter((call) => call.startsWith("annotations:"))).toEqual([
      "annotations:1:2"
    ]);
  });
});

describe("view only access", () => {
  it("writes nothing and gives one notice, however often it is asked", async () => {
    setup({ readOnly: true });
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");

    const first = await renderer.show("A", [marker("r1", "A", "1:1")]);
    const second = await renderer.show("A", [marker("r1", "A", "1:1")]);
    const third = await renderer.show("B", [marker("r2", "B", "1:1")]);

    expect(first).toEqual({ written: false, reason: "read_only", notice: READ_ONLY_NOTICE });
    expect(second).toEqual({ written: false, reason: "read_only", notice: null });
    expect(third).toEqual({ written: false, reason: "read_only", notice: null });
    expect(labels("1:1")).toEqual([]);
    expect(fake.commitUndo).not.toHaveBeenCalled();
  });

  it("stops trying after the first failure", async () => {
    setup({ readOnly: true });
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    const attempts = fake.calls.length;
    await renderer.show("A", [marker("r1", "A", "1:1", "other")]);

    expect(fake.calls.length).toBe(attempts);
  });

  it("undoes the part of a swap it had already written when the file turns out to be read only", async () => {
    setup();
    for (const id of ["1:1", "1:2"]) fake.addNode(id);
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);
    fake.state.readOnly = true;
    const result = await renderer.show("A", [marker("r1", "A", "1:1"), marker("r2", "A", "1:2")]);

    expect(result).toMatchObject({ written: false, reason: "read_only" });
    expect(labels("1:2")).toEqual([]);
  });

  it("does not throw on close after a failure", async () => {
    setup({ readOnly: true });
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker("r1", "A", "1:1")]);

    expect(() => renderer.clearSync()).not.toThrow();
  });
});

describe("when CADT cannot tell who the user is", () => {
  it("writes nothing and says why once, which is what a missing permission looks like", async () => {
    setup({ userId: null });
    fake.addNode("1:1");
    const renderer = createMarkerRenderer("s1");
    const first = await renderer.show("A", [marker("r1", "A", "1:1")]);
    const second = await renderer.show("A", [marker("r1", "A", "1:1")]);

    expect(first).toEqual({ written: false, reason: "no_user", notice: NO_USER_NOTICE });
    expect(second).toMatchObject({ notice: null });
    expect(fake.calls).toEqual([]);
  });
});
