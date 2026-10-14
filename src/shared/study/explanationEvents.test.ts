import { describe, expect, it } from "vitest";
import type { ExplanationKey } from "../teachMeWhy/explanationTypes";
import { isExplanationMessage } from "./explanationMessageTypes";
import { isStudyEvent } from "./studyEventSchema";
import type { StudyEventContext } from "./studyEvents";
import {
  buildDepthChanged,
  buildExplanationDismissed,
  buildExplanationOpened,
  buildTeachMeWhyOpened
} from "./studyOtherEvents";

const CTX: StudyEventContext = {
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  phase: "designing"
};
const KEY: ExplanationKey = { role: "caption", severity: "medium", size: "large", depth: 2 };
const T = "2026-10-14T10:00:00.000Z";

describe("explanation study events", () => {
  it("records the key and where it was opened from, and nothing else", () => {
    const event = buildTeachMeWhyOpened(CTX, T, KEY, "card");
    expect(event).toEqual({
      type: "explanation_opened",
      at: T,
      ctx: CTX,
      surface: "teach_me_why",
      key: KEY,
      source: "card"
    });
    expect(isStudyEvent(event)).toBe(true);
  });
  it("records the key before a depth change and the depth after", () => {
    const event = buildDepthChanged(CTX, T, KEY, 3);
    expect(event).toMatchObject({ type: "depth_changed", key: KEY, toDepth: 3 });
    expect(isStudyEvent(event)).toBe(true);
  });
  it("records a dismissal by key", () => {
    const event = buildExplanationDismissed(CTX, T, KEY);
    expect(event).toMatchObject({ type: "explanation_dismissed", key: KEY });
    expect(isStudyEvent(event)).toBe(true);
  });
  it("refuses a Teach Me Why open with no key or source, and a bad key or depth", () => {
    expect(isStudyEvent(buildExplanationOpened(CTX, T, "teach_me_why"))).toBe(false);
    expect(isStudyEvent({ ...buildTeachMeWhyOpened(CTX, T, KEY, "card"), source: "menu" })).toBe(
      false
    );
    expect(isStudyEvent({ ...buildDepthChanged(CTX, T, KEY, 3), toDepth: 4 })).toBe(false);
    expect(
      isStudyEvent({ ...buildExplanationDismissed(CTX, T, KEY), key: { ...KEY, role: "title" } })
    ).toBe(false);
  });
  it("still accepts the older card level open", () => {
    expect(isStudyEvent(buildExplanationOpened(CTX, T, "why_surfaced", "contrast:1:1"))).toBe(true);
  });
});

describe("isExplanationMessage", () => {
  it("accepts the three kinds and refuses anything malformed", () => {
    expect(
      isExplanationMessage({
        type: "EXPLANATION_EVENT",
        event: { kind: "opened", key: KEY, source: "tab" }
      })
    ).toBe(true);
    expect(
      isExplanationMessage({
        type: "EXPLANATION_EVENT",
        event: { kind: "depth_changed", key: KEY, toDepth: 1 }
      })
    ).toBe(true);
    expect(
      isExplanationMessage({ type: "EXPLANATION_EVENT", event: { kind: "dismissed", key: KEY } })
    ).toBe(true);
    expect(
      isExplanationMessage({
        type: "EXPLANATION_EVENT",
        event: { kind: "opened", key: KEY, source: "x" }
      })
    ).toBe(false);
    expect(
      isExplanationMessage({
        type: "EXPLANATION_EVENT",
        event: { kind: "dismissed", key: { ...KEY, depth: 9 } }
      })
    ).toBe(false);
    expect(
      isExplanationMessage({ type: "EXPLANATION_EVENT", event: { kind: "other", key: KEY } })
    ).toBe(false);
    expect(isExplanationMessage({ type: "EXPLANATION_EVENT" })).toBe(false);
    expect(isExplanationMessage(null)).toBe(false);
  });
});
