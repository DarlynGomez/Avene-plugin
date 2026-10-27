import { describe, expect, it, vi } from "vitest";

import type { DraftServerRequest } from "../../shared/handoff/draftRequest";
import { askDraftServer } from "./draftClient";

const request: DraftServerRequest = {
  requestId: "r",
  audience: "pm",
  blockId: "left",
  lines: ["Detected: {L1}"]
};
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

describe("askDraftServer", () => {
  it("posts the ids to the local server and reads the sentences", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        json({ sentences: ["Detected: {L1}"], reason: "ok", model: "m", ms: 4, blockId: "left" })
      );
    const result = await askDraftServer(request, 5000, fetchFn);
    expect(result).toEqual({
      kind: "reply",
      reply: { sentences: ["Detected: {L1}"], reason: "ok", model: "m", blockId: "left" }
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://localhost:8750/v1/draft");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("passes on a failure reason as an ordinary reply", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        json({ sentences: [], reason: "not-configured", model: null, ms: 0, blockId: "left" })
      );
    expect(await askDraftServer(request, 5000, fetchFn)).toMatchObject({
      kind: "reply",
      reply: { reason: "not-configured" }
    });
  });

  it("treats an HTTP error or a body that is not the shape as a reply with a reason", async () => {
    const down = vi.fn().mockResolvedValue(new Response("", { status: 502 }));
    expect(await askDraftServer(request, 5000, down)).toMatchObject({
      kind: "reply",
      reply: { reason: "unreachable", sentences: [] }
    });
    const odd = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    expect(await askDraftServer(request, 5000, odd)).toMatchObject({
      kind: "reply",
      reply: { reason: "malformed" }
    });
  });

  it("calls a refused connection a transport failure and never throws", async () => {
    const refused = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await askDraftServer(request, 5000, refused)).toEqual({
      kind: "transport",
      reason: "refused"
    });
  });

  it("calls a request that is not answered in time a transport failure", async () => {
    vi.useFakeTimers();
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    const pending = askDraftServer(request, 1000, hang as unknown as typeof fetch);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ kind: "transport", reason: "timeout" });
    vi.useRealTimers();
  });
});
