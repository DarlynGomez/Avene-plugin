import { describe, expect, it } from "vitest";

import { endBlock, reveal, startBlock, type Clock } from "./sessionTransitions";
import type { StudySession } from "./studyTypes";

const FORM = {
  participantId: "P01",
  block: 1,
  task: "A",
  condition: "post-task",
  paperConsentSigned: true
};

function clockAt(...times: string[]): Clock {
  let index = 0;
  return () => times[Math.min(index++, times.length - 1)] as string;
}

function session(patch: Partial<StudySession> = {}): StudySession {
  return {
    schemaVersion: 1,
    participantId: "P01",
    block: 1,
    task: "A",
    condition: "post-task",
    consentConfirmedAt: "2026-10-06T09:00:00.000Z",
    phase: "designing",
    startedAt: "2026-10-06T09:00:00.000Z",
    revealedAt: null,
    endedAt: null,
    exports: [],
    exitedAt: null,
    ...patch
  };
}

function refusalOf(result: ReturnType<typeof reveal>) {
  expect(result.ok).toBe(false);
  return result.ok ? null : result.refusal;
}

describe("startBlock", () => {
  it("starts a block designing, stamped from the injected clock", () => {
    const result = startBlock(FORM, null, clockAt("2026-10-06T09:00:00.000Z"));

    expect(result).toEqual({ ok: true, session: session() });
  });

  it("starts a live block with no reveal time", () => {
    const result = startBlock(
      { ...FORM, condition: "live" },
      null,
      clockAt("2026-10-06T09:00:00.000Z")
    );

    expect(result).toMatchObject({ ok: true, session: { condition: "live", revealedAt: null } });
  });

  it("refuses when the file already has a session", () => {
    const refusal = refusalOf(startBlock(FORM, session(), clockAt("x")));

    expect(refusal).toEqual({
      code: "session-exists",
      reason: "This file already has a study session."
    });
  });

  it("refuses when the file has a session that was exited", () => {
    const exited = session({ exitedAt: "2026-10-06T09:30:00.000Z" });

    expect(refusalOf(startBlock(FORM, exited, clockAt("x")))?.code).toBe("session-exists");
  });

  it("refuses without paper consent", () => {
    const refusal = refusalOf(
      startBlock({ ...FORM, paperConsentSigned: false }, null, clockAt("x"))
    );

    expect(refusal).toEqual({
      code: "invalid-form",
      reason: "Confirm that paper consent was signed"
    });
  });

  it("refuses a malformed participant id", () => {
    expect(refusalOf(startBlock({ ...FORM, participantId: "a b" }, null, clockAt("x")))?.code).toBe(
      "invalid-form"
    );
  });

  it("does not read the clock when it refuses", () => {
    let reads = 0;
    startBlock({}, null, () => String(++reads));

    expect(reads).toBe(0);
  });
});

describe("reveal", () => {
  it("moves a post-task block from designing to reviewing and stamps the time", () => {
    const result = reveal(session(), clockAt("2026-10-06T09:20:00.000Z"));

    expect(result).toEqual({
      ok: true,
      session: session({ phase: "reviewing", revealedAt: "2026-10-06T09:20:00.000Z" })
    });
  });

  it("does not change the session it was given", () => {
    const before = session();
    reveal(before, clockAt("t"));

    expect(before).toEqual(session());
  });

  it("is refused in the live condition", () => {
    expect(refusalOf(reveal(session({ condition: "live" }), clockAt("t")))?.code).toBe(
      "not-post-task"
    );
  });

  it.each(["reviewing", "ended"] as const)("is refused when the phase is %s", (phase) => {
    expect(refusalOf(reveal(session({ phase }), clockAt("t")))?.code).toBe("wrong-phase");
  });

  it("is refused after study mode was exited", () => {
    const exited = session({ exitedAt: "2026-10-06T09:40:00.000Z" });

    expect(refusalOf(reveal(exited, clockAt("t")))?.code).toBe("exited");
  });
});

describe("endBlock", () => {
  it("ends a live block from designing", () => {
    const result = endBlock(session({ condition: "live" }), clockAt("2026-10-06T09:20:00.000Z"));

    expect(result).toEqual({
      ok: true,
      session: session({ condition: "live", phase: "ended", endedAt: "2026-10-06T09:20:00.000Z" })
    });
  });

  it("ends a post-task block from reviewing and keeps the reveal time", () => {
    const reviewing = session({ phase: "reviewing", revealedAt: "2026-10-06T09:20:00.000Z" });
    const result = endBlock(reviewing, clockAt("2026-10-06T09:40:00.000Z"));

    expect(result).toEqual({
      ok: true,
      session: {
        ...reviewing,
        phase: "ended",
        endedAt: "2026-10-06T09:40:00.000Z"
      }
    });
  });

  it("refuses to end a post-task block that is still designing", () => {
    expect(refusalOf(endBlock(session(), clockAt("t")))?.code).toBe("review-required");
  });

  it("refuses a live block in the reviewing phase, which a live block never enters", () => {
    expect(
      refusalOf(endBlock(session({ condition: "live", phase: "reviewing" }), clockAt("t")))?.code
    ).toBe("wrong-phase");
  });

  it.each(["live", "post-task"] as const)(
    "refuses a %s block that has already ended",
    (condition) => {
      const ended = session({ condition, phase: "ended", endedAt: "2026-10-06T09:40:00.000Z" });

      expect(refusalOf(endBlock(ended, clockAt("t")))?.code).toBe("already-ended");
    }
  );

  it("is refused after study mode was exited", () => {
    const exited = session({ exitedAt: "2026-10-06T09:40:00.000Z" });

    expect(refusalOf(endBlock(exited, clockAt("t")))?.code).toBe("exited");
  });

  it("does not read the clock when it refuses", () => {
    let reads = 0;
    endBlock(session(), () => String(++reads));

    expect(reads).toBe(0);
  });
});
