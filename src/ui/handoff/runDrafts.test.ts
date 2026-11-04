import { describe, expect, it, vi } from "vitest";

import { buildAudienceDoc } from "../../shared/handoff/audiences";
import { docFor, reword, sampleInput, SECRETS } from "../../shared/handoff/draftFixtures";
import type { Audience } from "../../shared/handoff/types";
import type { DraftAsk } from "./draftClient";
import { blockKey, draftableSections, runDrafts } from "./runDrafts";

const input = sampleInput();
const docs = Object.fromEntries(
  (["developer", "pm", "higherUp", "client"] as const).map((a) => [a, buildAudienceDoc(input, a)])
) as Record<Audience, ReturnType<typeof docFor>>;
const NOW = () => "2026-10-28T10:00:00.000Z";
const okReply = (lines: string[], blockId = "x"): DraftAsk => ({
  kind: "reply",
  reply: { sentences: reword(lines), reason: "ok", model: "text-model:test", blockId }
});

describe("runDrafts", () => {
  it("drafts every block but Not covered, one request each, in order", async () => {
    const ask = vi.fn(async (r) => okReply(r.lines, r.blockId));
    const progress = vi.fn();
    const result = await runDrafts({ ask, now: NOW }, docs, ["pm"], {}, progress);
    const sections = draftableSections(docs.pm);
    expect(sections.map((s) => s.id)).not.toContain("notCovered");
    expect(ask.mock.calls.map(([r]) => r.blockId)).toEqual(sections.map((s) => s.id));
    expect(Object.keys(result.cache)).toEqual(sections.map((s) => `pm|${s.id}|text-model:test`));
    expect(result.stopped).toBeNull();
    expect(progress).toHaveBeenLastCalledWith(sections.length, sections.length);
  });

  it("sends ids only, nothing of the document goes out", async () => {
    const sent: string[] = [];
    const ask = async (r: { lines: string[]; blockId: string }) => {
      sent.push(JSON.stringify(r));
      return okReply(r.lines, r.blockId);
    };
    await runDrafts(
      { ask, now: NOW },
      docs,
      ["developer", "pm", "higherUp", "client"],
      {},
      () => undefined
    );
    expect(sent.length).toBeGreaterThan(4);
    for (const body of sent)
      for (const secret of SECRETS) expect(body, secret).not.toContain(secret);
  });

  it("stores each draft with the hash of the version it was written for", async () => {
    const result = await runDrafts(
      { ask: async (r) => okReply(r.lines), now: NOW },
      docs,
      ["client"],
      {},
      () => undefined
    );
    for (const entry of Object.values(result.cache)) {
      expect(entry.structureHash).toBe(docs.client.structureHash);
      expect(entry.generatedAt).toBe(NOW());
    }
  });

  it("stops at once when the server is down and says so in one plain line", async () => {
    const ask = vi.fn(async () => ({ kind: "transport", reason: "refused" }) as DraftAsk);
    const result = await runDrafts(
      { ask, now: NOW },
      docs,
      ["developer", "pm"],
      {},
      () => undefined
    );
    expect(ask).toHaveBeenCalledTimes(1);
    expect(result.stopped).toBe("The drafting helper is not running, so the template text stays.");
    expect(result.cache).toEqual({});
  });

  it("notes a typed reason for one block and goes on to the next", async () => {
    let calls = 0;
    const ask = async (r: { lines: string[]; blockId: string }): Promise<DraftAsk> =>
      (calls += 1) === 1
        ? {
            kind: "reply",
            reply: { sentences: [], reason: "rate-limited", model: null, blockId: r.blockId }
          }
        : okReply(r.lines, r.blockId);
    const result = await runDrafts({ ask, now: NOW }, docs, ["pm"], {}, () => undefined);
    const first = draftableSections(docs.pm)[0].id;
    expect(result.notes[blockKey("pm", first)]).toMatch(/busy/);
    expect(Object.keys(result.cache)).toHaveLength(draftableSections(docs.pm).length - 1);
  });

  it("does not store a draft that fails the checks", async () => {
    const ask = async (r: { lines: string[]; blockId: string }): Promise<DraftAsk> => ({
      kind: "reply",
      reply: {
        sentences: r.lines.map((l) => l + " It is compliant."),
        reason: "ok",
        model: "m",
        blockId: r.blockId
      }
    });
    const result = await runDrafts({ ask, now: NOW }, docs, ["pm"], {}, () => undefined);
    expect(result.cache).toEqual({});
    expect(Object.values(result.notes)[0]).toBe(
      "The draft did not pass the checks, so the template text stays."
    );
  });

  it("skips a block that would let a value out, without asking", async () => {
    const leaky = {
      ...docs.developer,
      sections: [{ id: "action", title: "x", lines: ["Detected: the Helper text"] }]
    };
    const ask = vi.fn();
    const result = await runDrafts(
      { ask, now: NOW },
      { ...docs, developer: leaky },
      ["developer"],
      {},
      () => undefined
    );
    expect(ask).not.toHaveBeenCalled();
    expect(result.notes["developer|action"]).toMatch(/your own words/);
  });

  it("keeps drafts already saved for other blocks", async () => {
    const first = await runDrafts(
      { ask: async (r) => okReply(r.lines), now: NOW },
      docs,
      ["pm"],
      {},
      () => undefined
    );
    const second = await runDrafts(
      { ask: async (r) => okReply(r.lines), now: NOW },
      docs,
      ["client"],
      first.cache,
      () => undefined
    );
    expect(Object.keys(second.cache).filter((k) => k.startsWith("pm|")).length).toBe(
      Object.keys(first.cache).length
    );
  });
});
