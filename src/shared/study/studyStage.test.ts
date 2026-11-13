import { describe, expect, it } from "vitest";

import { EXPLORATION_NOTE, showsExplorationNote, studyStages } from "./studyStage";
import type { StudySession } from "./studyTypes";

const BASE: StudySession = {
  schemaVersion: 1,
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  consentConfirmedAt: "2026-11-13T09:00:00.000Z",
  phase: "designing",
  startedAt: "2026-11-13T09:00:00.000Z",
  revealedAt: null,
  endedAt: null,
  exports: [],
  exitedAt: null
};
const ENDED = { phase: "ended" as const, endedAt: "2026-11-13T09:40:00.000Z" };
const EXPORTED = { ...ENDED, exports: ["2026-11-13T09:41:00.000Z"] };

/** The stages as one string, "Block 1:done Block 2:now ..." */
const line = (s: Partial<StudySession>) =>
  studyStages({ ...BASE, ...s })
    .map((stage) => `${stage.label}:${stage.state}`)
    .join(" ");

describe("the study stages", () => {
  it("always lists the five stages in order", () => {
    expect(studyStages(BASE).map((s) => s.label)).toEqual([
      "Block 1",
      "Block 2",
      "Post-task",
      "Export done",
      "Exited"
    ]);
  });

  it("is on block 1 while the first block runs", () => {
    expect(line({})).toBe("Block 1:now Block 2:next Post-task:next Export done:next Exited:next");
  });

  it("is on the export once block 1 has ended, since block 2 is another file", () => {
    expect(line(ENDED)).toBe(
      "Block 1:done Block 2:next Post-task:next Export done:now Exited:next"
    );
  });

  it("is on the exit once block 1 is exported, and on nothing after it", () => {
    expect(line(EXPORTED)).toBe(
      "Block 1:done Block 2:next Post-task:next Export done:done Exited:now"
    );
    expect(line({ ...EXPORTED, exitedAt: "2026-11-13T09:45:00.000Z" })).toBe(
      "Block 1:done Block 2:next Post-task:next Export done:done Exited:done"
    );
  });

  it("counts block 1 as done and is on block 2 while the second block runs", () => {
    expect(line({ block: 2 })).toBe(
      "Block 1:done Block 2:now Post-task:next Export done:next Exited:next"
    );
  });

  it("is on post-task once block 2 has ended and before its export", () => {
    expect(line({ block: 2, ...ENDED })).toBe(
      "Block 1:done Block 2:done Post-task:now Export done:next Exited:next"
    );
  });

  it("is on the exit once block 2 is exported, and everything is done after it", () => {
    expect(line({ block: 2, ...EXPORTED })).toBe(
      "Block 1:done Block 2:done Post-task:done Export done:done Exited:now"
    );
    expect(line({ block: 2, ...EXPORTED, exitedAt: "2026-11-13T09:45:00.000Z" })).toBe(
      "Block 1:done Block 2:done Post-task:done Export done:done Exited:done"
    );
  });

  it("does not count an export taken before the block ended", () => {
    expect(line({ block: 2, ...ENDED, exports: ["2026-11-13T09:30:00.000Z"] })).toBe(
      "Block 1:done Block 2:done Post-task:now Export done:next Exited:next"
    );
  });

  it("shows nothing as now after an exit taken before the block ended", () => {
    expect(line({ exitedAt: "2026-11-13T09:20:00.000Z" })).toBe(
      "Block 1:next Block 2:next Post-task:next Export done:next Exited:done"
    );
  });
});

describe("the exploration note", () => {
  it("shows only after the second block has been exited", () => {
    const exited = "2026-11-13T09:45:00.000Z";
    expect(showsExplorationNote({ ...BASE, block: 2, exitedAt: exited })).toBe(true);
    expect(showsExplorationNote({ ...BASE, block: 2 })).toBe(false);
    expect(showsExplorationNote({ ...BASE, block: 1, exitedAt: exited })).toBe(false);
  });

  it("says what the researcher needs to know and nothing about features", () => {
    expect(EXPLORATION_NOTE).toBe("Exploration: nothing from here is in the study export.");
    expect(EXPLORATION_NOTE).not.toMatch(/[–—]/);
  });
});
