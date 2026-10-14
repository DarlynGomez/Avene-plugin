import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudyEvent, StudyEventContext } from "../../shared/study/studyEvents";
import type { ExplanationKey } from "../../shared/teachMeWhy/explanationTypes";
import { handleExplanationMessage } from "./explanationProtocol";

const emitted: StudyEvent[][] = [];
vi.mock("../study/adapter/studyEmitter", () => ({
  emitStudy: (build: (ctx: StudyEventContext) => StudyEvent[]) => {
    emitted.push(
      build({ participantId: "P01", block: 1, task: "A", condition: "live", phase: "designing" })
    );
  }
}));

const KEY: ExplanationKey = { role: "unknown", severity: "high", size: "normal", depth: 1 };

beforeEach(() => {
  emitted.length = 0;
});

describe("handleExplanationMessage", () => {
  it("logs an open with its key and source", () => {
    handleExplanationMessage({
      type: "EXPLANATION_EVENT",
      event: { kind: "opened", key: KEY, source: "tab" }
    });
    expect(emitted[0]).toEqual([
      expect.objectContaining({
        type: "explanation_opened",
        surface: "teach_me_why",
        key: KEY,
        source: "tab"
      })
    ]);
  });
  it("logs a depth change and a dismissal", () => {
    handleExplanationMessage({
      type: "EXPLANATION_EVENT",
      event: { kind: "depth_changed", key: KEY, toDepth: 3 }
    });
    handleExplanationMessage({ type: "EXPLANATION_EVENT", event: { kind: "dismissed", key: KEY } });
    expect(emitted.map((events) => events[0].type)).toEqual([
      "depth_changed",
      "explanation_dismissed"
    ]);
  });
});
