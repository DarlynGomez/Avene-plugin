import { describe, expect, it, vi } from "vitest";
import type { RoleServerRequest } from "../../shared/roles/roleRequest";
import { askRoleServer } from "./roleServerClient";

const request: RoleServerRequest = {
  requestId: "r",
  image: "aGk=",
  crop: "node",
  exportScale: 1,
  fontSizePx: 16,
  inputs: { sizeRatio: 1.1, fontWeight: 600, wordCount: 1, centerYFraction: 0.1 },
  backgroundHex: "#FFFFFF",
  mode: "live"
};
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

describe("askRoleServer", () => {
  it("posts the request to the local server and reads the label", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(json({ label: "caption", reason: "ok", model: "m", ms: 9 }));
    const result = await askRoleServer(request, 5000, fetchFn);
    expect(result).toEqual({
      kind: "reply",
      reply: { label: "caption", reason: "ok", model: "m", ms: 9 },
      retryAfterSeconds: null
    });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://localhost:8750/v1/role");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("calls a refused connection a transport failure", async () => {
    const result = await askRoleServer(
      request,
      5000,
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    );
    expect(result).toEqual({ kind: "transport", reason: "refused" });
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
    const pending = askRoleServer(request, 5000, hang as never);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual({ kind: "transport", reason: "timeout" });
    vi.useRealTimers();
  });

  it.each([500, 502, 503])(
    "treats a %s as an ordinary answer, unsure, and not as the server being down",
    async (status) => {
      const result = await askRoleServer(
        request,
        5000,
        vi.fn().mockResolvedValue(new Response("oops", { status }))
      );
      expect(result).toMatchObject({
        kind: "reply",
        reply: { label: "unsure", reason: "unreachable" }
      });
    }
  );

  it("treats a 429 as rate limited and passes on its Retry-After", async () => {
    const response = new Response("", { status: 429, headers: { "retry-after": "7" } });
    expect(await askRoleServer(request, 5000, vi.fn().mockResolvedValue(response))).toMatchObject({
      kind: "reply",
      reply: { label: "unsure", reason: "rate-limited" },
      retryAfterSeconds: 7
    });
  });

  it("treats a reply that is not the expected shape as unsure", async () => {
    for (const body of ["not json", { label: "banner" }, null]) {
      const response = typeof body === "string" ? new Response(body, { status: 200 }) : json(body);
      expect(await askRoleServer(request, 5000, vi.fn().mockResolvedValue(response))).toMatchObject(
        {
          kind: "reply",
          reply: { label: "unsure", reason: "malformed" }
        }
      );
    }
  });

  it("passes on the reasons the server gives for unsure", async () => {
    for (const reason of ["mixed-size", "too-small-to-send", "rate-limited", "timeout", "auth"]) {
      const result = await askRoleServer(
        request,
        5000,
        vi.fn().mockResolvedValue(json({ label: "unsure", reason, model: null, ms: 0 }))
      );
      expect(result).toMatchObject({ kind: "reply", reply: { label: "unsure", reason } });
    }
  });
});
