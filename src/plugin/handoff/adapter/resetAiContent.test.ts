import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NodeNote } from "../../../shared/handoff/noteStorage";
import type { CachedSuggestion } from "../../../shared/handoff/alt/altSuggestCache";
import type { FakeNode } from "../../markers/adapter/markerFigmaStub";
import { annotateNode } from "./annotationActions";
import { altNote, installFake, giveNote, labelsOf } from "./annotationHarness";
import { loadDraftCache, saveDraftCache } from "./draftCacheStore";
import { loadSuggestions, saveSuggestions } from "./altSuggestStore";
import { loadAllNotes, setNodeNotes } from "./notesStore";
import { resetAiContent } from "./resetAiContent";

const AT = "2026-11-05T10:00:00.000Z";
const suggestion: CachedSuggestion = {
  imageHash: "h1",
  modelId: "m",
  style: "concise",
  kind: "describe",
  text: "A sign",
  at: AT
};
const draft = {
  "pm|left|m": {
    audience: "pm" as const,
    blockId: "left",
    modelId: "m",
    structureHash: "abcd1234",
    sentences: ["Detected: {L1}"],
    generatedAt: AT
  }
};
const name: NodeNote = { category: "name", text: "Menu", updatedAt: AT };

let fake: ReturnType<typeof installFake>;
let ai: FakeNode;
let mine: FakeNode;
let edited: FakeNode;

async function seed() {
  ai = fake.addNode("1:1", [{ label: "Keep the corners square", categoryId: "designer" }]);
  mine = fake.addNode("1:2", []);
  edited = fake.addNode("1:3", []);
  giveNote(ai, altNote("A sunny cafe table", { source: "ai" }), name);
  giveNote(mine, altNote("My own words"));
  giveNote(edited, altNote("A bigger table", { source: "ai_edited" }));
  await setNodeNotes("1:1", [altNote("A sunny cafe table", { source: "ai" }), name]);
  await setNodeNotes("1:2", [altNote("My own words")]);
  await setNodeNotes("1:3", [altNote("A bigger table", { source: "ai_edited" })]);
  saveSuggestions([suggestion]);
  saveDraftCache(draft);
}

beforeEach(async () => {
  fake = installFake();
  await seed();
});
afterEach(() => vi.unstubAllGlobals());

describe("the development reset", () => {
  it("clears the text drafts, the saved suggestions and the alt notes that came from a model, and says how many", async () => {
    const result = await resetAiContent(true);
    expect(result).toEqual({
      type: "HANDOFF_AI_RESET_RESULT",
      drafts: 1,
      suggestions: 1,
      notes: 2,
      annotationsRemoved: 0,
      annotationsLeft: 0
    });
    expect(loadDraftCache()).toEqual({});
    expect(loadSuggestions()).toEqual([]);
  });

  it("keeps the notes the designer wrote and every note that is not alt text", async () => {
    await resetAiContent(true);
    const notes = await loadAllNotes();
    expect(Object.keys(notes).sort()).toEqual(["1:1", "1:2"]);
    expect(notes["1:2"].map((n) => n.text)).toEqual(["My own words"]);
    expect(notes["1:1"]).toEqual([name]);
  });

  it("takes off the annotation it wrote for such a note, and leaves the designer's own", async () => {
    await annotateNode("1:1");
    expect(labelsOf(ai)).toContain("A sunny cafe table");
    const result = await resetAiContent(true);
    expect(result).toMatchObject({ notes: 2, annotationsRemoved: 1, annotationsLeft: 0 });
    expect(labelsOf(ai)).toEqual(["Keep the corners square"]);
  });

  it("leaves the annotation and says so when annotations are not allowed", async () => {
    await annotateNode("1:1");
    const result = await resetAiContent(false);
    expect(result).toMatchObject({ notes: 2, annotationsRemoved: 0, annotationsLeft: 1 });
    expect(labelsOf(ai)).toContain("A sunny cafe table");
  });

  it("does not touch an annotation on a note the designer wrote", async () => {
    await annotateNode("1:2");
    await resetAiContent(true);
    expect(labelsOf(mine)).toEqual(["My own words"]);
  });

  it("clears nothing the second time, and does not throw on a file with nothing in it", async () => {
    await resetAiContent(true);
    expect(await resetAiContent(true)).toMatchObject({ drafts: 0, suggestions: 0, notes: 0 });
  });
});
