import { describe, expect, it } from "vitest";

import {
  ENDED_MESSAGE,
  WAITING_MESSAGE,
  participantVisibility,
  type ParticipantVisibility
} from "./participantVisibility";
import type { StudySession } from "./studyTypes";

function session(patch: Partial<StudySession>): StudySession {
  return {
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
    exitedAt: null,
    ...patch
  };
}

const FEEDBACK_SURFACES = [
  "liveWatchLabel",
  "issueList",
  "headline",
  "counts",
  "filterAndGrouping",
  "ignoredTrayAndDecisions",
  "decisionOffers",
  "canvasMarkers",
  "adjustSheet",
  "ignoreSheet",
  "deferPinRestore",
  "showOnCanvas",
  "elementRoleQuestions"
] as const satisfies readonly (keyof ParticipantVisibility)[];

describe("participantVisibility with no restriction", () => {
  it("shows everything, with no message, when there is no session", () => {
    const visible = participantVisibility(null);

    expect(
      Object.entries(visible)
        .filter(([key]) => key !== "message")
        .every(([, v]) => v === true)
    ).toBe(true);
    expect(visible.message).toBeNull();
  });

  it("shows the Teach Me Why placeholder as today", () => {
    expect(participantVisibility(null).teachMeWhyTab).toBe(true);
  });

  it("treats an exited session as no session, whatever its phase", () => {
    const exited = session({ phase: "designing", condition: "post-task", exitedAt: "t" });

    expect(participantVisibility(exited)).toEqual(participantVisibility(null));
  });
});

describe("participantVisibility, live designing", () => {
  const visible = participantVisibility(session({ condition: "live", phase: "designing" }));

  it.each(FEEDBACK_SURFACES)("shows %s", (surface) => {
    expect(visible[surface]).toBe(true);
  });

  it("shows the wordmark and no message", () => {
    expect(visible.wordmark).toBe(true);
    expect(visible.message).toBeNull();
  });

  it("never shows calibration or consent", () => {
    expect(visible.calibrationAndConsent).toBe(false);
  });
});

describe("participantVisibility, post-task designing", () => {
  const visible = participantVisibility(session({ condition: "post-task", phase: "designing" }));

  it.each(FEEDBACK_SURFACES)("hides %s", (surface) => {
    expect(visible[surface]).toBe(false);
  });

  it("keeps only the wordmark and the one neutral line", () => {
    expect(visible.wordmark).toBe(true);
    expect(visible.message).toBe("Feedback will appear when you finish designing.");
    expect(visible.message).toBe(WAITING_MESSAGE);
  });

  it("never shows calibration or consent", () => {
    expect(visible.calibrationAndConsent).toBe(false);
  });
});

describe("participantVisibility, post-task reviewing", () => {
  const visible = participantVisibility(session({ condition: "post-task", phase: "reviewing" }));

  it.each(FEEDBACK_SURFACES)("shows %s", (surface) => {
    expect(visible[surface]).toBe(true);
  });

  it("has no message and never shows calibration or consent", () => {
    expect(visible.message).toBeNull();
    expect(visible.calibrationAndConsent).toBe(false);
  });
});

describe("participantVisibility, ended", () => {
  it.each(["live", "post-task"] as const)(
    "hides every feedback surface for a %s block",
    (condition) => {
      const visible = participantVisibility(session({ condition, phase: "ended", endedAt: "t" }));

      for (const surface of FEEDBACK_SURFACES) expect(visible[surface]).toBe(false);
      expect(visible.wordmark).toBe(true);
      expect(visible.calibrationAndConsent).toBe(false);
      expect(visible.message).toBe("This task has ended.");
      expect(visible.message).toBe(ENDED_MESSAGE);
    }
  );
});

describe("participantVisibility, Teach Me Why", () => {
  const columns: [string, Partial<StudySession>][] = [
    ["live designing", { condition: "live", phase: "designing" }],
    ["post-task designing", { condition: "post-task", phase: "designing" }],
    ["post-task reviewing", { condition: "post-task", phase: "reviewing" }],
    ["ended", { condition: "live", phase: "ended" }]
  ];

  it.each(columns)("is hidden in %s when it is not built", (_name, patch) => {
    expect(participantVisibility(session(patch), { teachMeWhyBuilt: false }).teachMeWhyTab).toBe(
      false
    );
  });

  it.each([
    ["live designing", { condition: "live", phase: "designing" }, true],
    ["post-task designing", { condition: "post-task", phase: "designing" }, false],
    ["post-task reviewing", { condition: "post-task", phase: "reviewing" }, true],
    ["ended", { condition: "post-task", phase: "ended" }, false]
  ] as [string, Partial<StudySession>, boolean][])(
    "follows where feedback appears in %s",
    (_name, patch, expected) => {
      expect(participantVisibility(session(patch)).teachMeWhyTab).toBe(expected);
    }
  );
});

describe("participantVisibility, element role questions", () => {
  it.each([
    ["live", "designing", true],
    ["post-task", "designing", false],
    ["post-task", "reviewing", true],
    ["post-task", "ended", false],
    ["live", "ended", false]
  ] as const)("%s %s is %s", (condition, phase, expected) => {
    expect(participantVisibility(session({ condition, phase })).elementRoleQuestions).toBe(
      expected
    );
  });
});
