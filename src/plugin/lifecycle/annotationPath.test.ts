import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { labelsOf, installFake, giveNote, altNote } from "../handoff/adapter/annotationHarness";
import { createMarkerRenderer } from "../markers/adapter/markerRenderer";
import type { FakeNode } from "../markers/adapter/markerFigmaStub";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { handleExplanationOrRole } from "./otherProtocols";

vi.mock("../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../shared/handoffFlags")>()),
  FEATURE_HANDOFF: true,
  FEATURE_ALT_ANNOTATIONS: true
}));
vi.mock("../study/adapter/studySessionStore", async (original) => ({
  ...(await original<typeof import("../study/adapter/studySessionStore")>()),
  activeStudySession: vi.fn(() => null)
}));

const DESIGNER: Annotation = { label: "Keep the corners square", categoryId: "designer-cat" };
const marker = {
  signature: "r1",
  screenId: "A",
  issueId: "contrast:1:1",
  nodeId: "1:1",
  label: "2.2"
};

let fake: ReturnType<typeof installFake>;
let node: FakeNode;
const send = async (message: Record<string, unknown>) => {
  const replies: Record<string, unknown>[] = [];
  await handleExplanationOrRole(message, (r) => replies.push(r as Record<string, unknown>));
  return replies[0];
};
const alt = () =>
  node.annotations.filter(
    (a) => a.categoryId === fake.categories.find((c) => c.label === "Alt text")?.id
  );

beforeEach(() => {
  fake = installFake();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  node = fake.addNode("1:1", [DESIGNER]);
  giveNote(node, altNote("A cafe sign"));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("add, update and remove through the real message path", () => {
  it("each acts on this layer only and leaves the designer's annotation and a CADT marker alone", async () => {
    const renderer = createMarkerRenderer("s1");
    await renderer.show("A", [marker]);
    const designer = node.annotations[0];
    const cadt = fake.categories.find((c) => c.label === "CADT")?.id;

    expect(await send({ type: "HANDOFF_ANNOTATE", nodeId: "1:1" })).toMatchObject({
      ok: true,
      status: "in-sync"
    });
    expect(alt()).toHaveLength(1);
    expect(node.annotations[0]).toBe(designer);
    expect(node.annotations.filter((a) => a.categoryId === cadt)).toHaveLength(1);

    await send({
      type: "HANDOFF_ALT_SET",
      nodeId: "1:1",
      text: "A bigger cafe sign",
      decorative: false,
      source: "designer"
    });
    expect(await send({ type: "HANDOFF_ANNOTATION_STATUS_REQUEST", nodeIds: ["1:1"] })).toEqual({
      type: "HANDOFF_ANNOTATION_STATUSES",
      statuses: { "1:1": "out-of-date" }
    });
    expect(await send({ type: "HANDOFF_ANNOTATION_UPDATE", nodeId: "1:1" })).toMatchObject({
      ok: true
    });
    expect(alt().map((a) => a.label)).toEqual(["A bigger cafe sign"]);
    expect(node.annotations[0]).toBe(designer);
    expect(node.annotations.filter((a) => a.categoryId === cadt)).toHaveLength(1);

    expect(await send({ type: "HANDOFF_ANNOTATION_REMOVE", nodeId: "1:1" })).toMatchObject({
      ok: true,
      status: "none"
    });
    expect(alt()).toEqual([]);
    expect(labelsOf(node)).toEqual(["Keep the corners square", ""]);
  });

  it("an alt annotation and a marker on one layer survive each other's cleanup: close, the launch sweep, and an undo with no category", async () => {
    const first = createMarkerRenderer("s1");
    await send({ type: "HANDOFF_ANNOTATE", nodeId: "1:1" });
    await first.show("A", [marker]);
    first.clearSync();
    expect(labelsOf(node)).toEqual(["Keep the corners square", "A cafe sign"]);

    await createMarkerRenderer("s2").show("A", [marker]);
    await createMarkerRenderer("s3").sweepOrphans();
    expect(labelsOf(node)).toEqual(["Keep the corners square", "A cafe sign"]);

    const third = createMarkerRenderer("s4");
    await third.show("A", [marker]);
    node.annotations = node.annotations.map(({ label }) => ({ label }));
    third.clearSync();
    expect(labelsOf(node)).toEqual(["Keep the corners square", "A cafe sign"]);

    // and the other way round: removing the alt annotation leaves a marker that is there
    const fourth = createMarkerRenderer("s5");
    node.annotations = [DESIGNER];
    giveNote(
      node,
      altNote("A cafe sign", { annotated: true, annotatedAt: "t", annotatedHash: "x" })
    );
    await fourth.show("A", [marker]);
    await send({ type: "HANDOFF_ANNOTATION_REMOVE", nodeId: "1:1" });
    expect(
      node.annotations.filter(
        (a) => a.categoryId === fake.categories.find((c) => c.label === "CADT")?.id
      )
    ).toHaveLength(1);
  });

  it("is refused while a study is active, and leaves the file as it was", async () => {
    vi.mocked(activeStudySession).mockReturnValue({
      schemaVersion: 1,
      participantId: "P01",
      block: 1,
      task: "A",
      condition: "live",
      consentConfirmedAt: "t",
      phase: "designing",
      startedAt: "t",
      revealedAt: null,
      endedAt: null,
      exports: [],
      exitedAt: null
    });
    const before = [...node.annotations];
    for (const type of [
      "HANDOFF_ANNOTATE",
      "HANDOFF_ANNOTATION_UPDATE",
      "HANDOFF_ANNOTATION_REMOVE"
    ]) {
      expect(await send({ type, nodeId: "1:1" })).toEqual({ type: "HANDOFF_ANNOTATION_REFUSED" });
    }
    expect(node.annotations).toEqual(before);
  });
});
