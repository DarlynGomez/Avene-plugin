import { describe, expect, it } from "vitest";

import { draftableSectionsOf } from "./draftFixtureHelpers";
import { fallbackLine, leaksValue, prepareDraftRequest, readDraftReply } from "./draftRequest";
import { SECRETS, docFor } from "./draftFixtures";

describe("prepareDraftRequest", () => {
  it("sends ids and template words only, never a value of the document", () => {
    for (const audience of ["developer", "pm", "higherUp", "client"] as const) {
      const doc = docFor(audience);
      for (const section of draftableSectionsOf(doc)) {
        const request = prepareDraftRequest(audience, section, doc.slots);
        expect(request, `${audience} ${section.id}`).not.toBeNull();
        const body = JSON.stringify(request);
        for (const secret of SECRETS) expect(body, secret).not.toContain(secret);
        for (const value of Object.values(doc.slots)) {
          if (value.length >= 3) expect(body, value).not.toContain(value);
        }
        expect(request?.lines).toEqual(section.lines);
      }
    }
  });

  it("refuses a block that would let a value out, and names none of it", () => {
    const doc = docFor("developer");
    const leaky = { id: "action", lines: ["Detected: the Helper text on {S1}"] };
    expect(leaksValue(leaky.lines, doc.slots)).toBe(true);
    expect(prepareDraftRequest("developer", leaky, doc.slots)).toBeNull();
  });

  it("does not mistake a part of a longer word for a value", () => {
    expect(leaksValue(["Detected: {L1} on {S1}"], { L1: "Helper", S1: "Pay" })).toBe(false);
    expect(leaksValue(["Detected: a Payments page"], { S1: "Payment" })).toBe(false);
  });

  it("gives each request its own id", () => {
    const doc = docFor("pm");
    const [section] = draftableSectionsOf(doc);
    const a = prepareDraftRequest("pm", section, doc.slots);
    const b = prepareDraftRequest("pm", section, doc.slots);
    expect(a?.requestId).not.toBe(b?.requestId);
  });
});

describe("readDraftReply", () => {
  it("reads a good reply", () => {
    expect(
      readDraftReply({ sentences: ["a"], reason: "ok", model: "m", ms: 3, blockId: "left" })
    ).toEqual({
      sentences: ["a"],
      reason: "ok",
      model: "m",
      blockId: "left"
    });
  });

  it.each([
    null,
    "text",
    {},
    { sentences: "a", reason: "ok" },
    { sentences: [1], reason: "ok" },
    { sentences: [] }
  ])("calls %j malformed", (body) => {
    expect(readDraftReply(body)).toMatchObject({ sentences: [], reason: "malformed" });
  });
});

describe("fallbackLine", () => {
  it("has one plain line for each reason and one for any other", () => {
    for (const reason of [
      "refused",
      "timeout",
      "not-configured",
      "rate-limited",
      "too-large",
      "rejected",
      "values",
      "empty",
      "auth"
    ]) {
      expect(fallbackLine(reason)).toMatch(/\.$/);
    }
    expect(fallbackLine("refused")).toBe(
      "The drafting helper is not running, so the template text stays."
    );
    expect(fallbackLine("auth")).toBe(fallbackLine("anything else"));
    expect(Object.values({ a: fallbackLine("timeout") }).join()).not.toMatch(/[—–]/);
  });
});
