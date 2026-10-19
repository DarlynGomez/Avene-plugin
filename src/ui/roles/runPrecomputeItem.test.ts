import { describe, expect, it, vi } from "vitest";
import type { RoleServerReply, RoleServerRequest } from "../../shared/roles/roleRequest";
import { runPrecomputeItem } from "./runPrecomputeItem";
import type { AskResult } from "./roleServerClient";

const request = {} as RoleServerRequest;
const reply = (reason: string, label = "unsure"): AskResult => ({
  kind: "reply",
  reply: { label, reason, model: "m", ms: 1 } as RoleServerReply,
  retryAfterSeconds: null
});
const limited = (retryAfterSeconds: number | null = null): AskResult => ({
  kind: "reply",
  reply: { label: "unsure", reason: "rate-limited", model: null, ms: 0 },
  retryAfterSeconds
});

function deps(answers: AskResult[]) {
  const sleeps: number[] = [];
  const ask = vi.fn(async () => answers.shift() ?? reply("ok", "label"));
  return {
    sleeps,
    ask,
    deps: { ask, sleep: async (ms: number) => void sleeps.push(ms), random: () => 1 }
  };
}

describe("runPrecomputeItem", () => {
  it("takes an answer at once, with the long precompute allowance", async () => {
    const run = deps([reply("ok", "caption")]);
    expect(await runPrecomputeItem(request, run.deps)).toMatchObject({
      kind: "answered",
      reply: { label: "caption" }
    });
    expect(run.ask).toHaveBeenCalledWith(request, 60000);
    expect(run.sleeps).toEqual([]);
  });

  it("retries a rate limited answer with growing waits until it is answered", async () => {
    const run = deps([limited(), limited(), reply("ok", "label")]);
    expect(await runPrecomputeItem(request, run.deps)).toMatchObject({
      kind: "answered",
      reply: { reason: "ok" }
    });
    expect(run.sleeps).toEqual([2000, 4000]);
  });

  it("waits as long as a Retry-After says", async () => {
    const run = deps([limited(9), reply("ok", "label")]);
    await runPrecomputeItem(request, run.deps);
    expect(run.sleeps).toEqual([9000]);
  });

  it("hands back a rate limited answer after the last try, to be left for the next run", async () => {
    const run = deps([limited(), limited(), limited(), limited(), limited(), limited()]);
    const outcome = await runPrecomputeItem(request, run.deps);
    expect(outcome).toMatchObject({ kind: "answered", reply: { reason: "rate-limited" } });
    expect(run.ask).toHaveBeenCalledTimes(5);
    expect(run.sleeps).toEqual([2000, 4000, 8000, 16000]);
  });

  it("does not retry any other reason, an unsure from the model included", async () => {
    for (const reason of [
      "auth",
      "timeout",
      "malformed",
      "too-small-to-send",
      "mixed-size",
      "ok"
    ]) {
      const run = deps([reply(reason)]);
      await runPrecomputeItem(request, run.deps);
      expect(run.ask).toHaveBeenCalledTimes(1);
    }
  });

  it("reports a transport failure and stops there", async () => {
    const run = deps([{ kind: "transport", reason: "refused" }]);
    expect(await runPrecomputeItem(request, run.deps)).toEqual({
      kind: "transport",
      failure: "unreachable"
    });
    const timed = deps([{ kind: "transport", reason: "timeout" }]);
    expect(await runPrecomputeItem(request, timed.deps)).toEqual({
      kind: "transport",
      failure: "timeout"
    });
  });
});
