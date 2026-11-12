import { describe, expect, it } from "vitest";

import { keyToString, parseKeyString } from "../teachMeWhy/explanationKey";
import type { ExplanationKey } from "../teachMeWhy/explanationTypes";
import { isStudyEvent } from "./studyEventSchema";
import type { StudyEventContext } from "./studyEvents";
import {
  buildDepthChanged,
  buildExplanationDismissed,
  buildTeachMeWhyOpened
} from "./studyOtherEvents";

const CTX: StudyEventContext = {
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "live",
  phase: "designing"
};
const KEY: ExplanationKey = { role: "button text", severity: "high", size: "large", depth: 1 };
const T = "2026-11-12T10:00:00.000Z";

describe("the explanation key format", () => {
  it("is still role, severity, size and depth joined by colons", () => {
    expect(keyToString(KEY)).toBe("button text:high:large:1");
    expect(parseKeyString("button text:high:large:1")).toEqual(KEY);
  });
  it("is carried unchanged by explanation_opened, depth_changed and explanation_dismissed", () => {
    const events = [
      buildTeachMeWhyOpened(CTX, T, KEY, "card"),
      buildDepthChanged(CTX, T, KEY, 2),
      buildExplanationDismissed(CTX, T, KEY)
    ];
    for (const event of events) {
      expect(event.key).toEqual(KEY);
      expect(Object.keys(event.key ?? {}).sort()).toEqual(["depth", "role", "severity", "size"]);
      expect(isStudyEvent(event)).toBe(true);
    }
  });
});
