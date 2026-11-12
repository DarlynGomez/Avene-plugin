import { describe, expect, it } from "vitest";

import { FEATURE_BACKDROP_SHAPES } from "./detectionFlags";
import { FEATURE_CALENDAR } from "./calendarFlags";
import { FEATURE_MODULES } from "./moduleFlags";
import { FEATURE_MARKERS, FEATURE_VARIABLE_SCOPE } from "./featureFlags";
import { FEATURE_ALT_ANNOTATIONS, FEATURE_ALT_SUGGEST_LIVE, FEATURE_HANDOFF } from "./handoffFlags";

/** Every flag value of the study build in one place, a change to any flag has to edit this table */
describe("study build flag values", () => {
  it.each([
    ["FEATURE_HANDOFF", FEATURE_HANDOFF, true],
    ["FEATURE_CALENDAR", FEATURE_CALENDAR, true],
    ["FEATURE_BACKDROP_SHAPES", FEATURE_BACKDROP_SHAPES, true],
    ["FEATURE_ALT_ANNOTATIONS", FEATURE_ALT_ANNOTATIONS, false],
    ["FEATURE_ALT_SUGGEST_LIVE", FEATURE_ALT_SUGGEST_LIVE, false],
    ["FEATURE_VARIABLE_SCOPE", FEATURE_VARIABLE_SCOPE, false],
    ["FEATURE_MARKERS", FEATURE_MARKERS, false],
    ["FEATURE_MODULES", FEATURE_MODULES, true]
  ])("%s is %s", (_name, actual, expected) => {
    expect(actual).toBe(expected);
  });
});
