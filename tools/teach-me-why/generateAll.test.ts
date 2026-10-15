import { describe, expect, it } from "vitest";
import type { GenAiClient } from "./client";
import { generateAll, type GenerateDeps } from "./generateAll";
import { PROMPT_VERSION } from "./prompt";
import { TokenWindow, type Clock } from "./rateLimit";
import type { Progress } from "./types";

const clock: Clock = { now: () => 0, sleep: () => Promise.resolve() };
const words = (count: number, word = "word") => Array.from({ length: count }, () => word).join(" ");

/** Answers by depth, read from the word limit line the prompt carries */
function goodReply(user: string) {
  const depth = /Depth: (\d)/.exec(user)?.[1];
  const text =
    depth === "1"
      ? `{measured} {required} change the text to {fix} ${words(30, "quick")}`
      : depth === "2"
        ? `Situation first. ${words(70, "reader")}`
        : `The principle for {foreground} first. ${words(110, "lesson")}`;
  // Depths 2 and 3 are built on the first fact the row offers, when it offers any
  const fact =
    depth === "1" ? undefined : /^(F\d+)\b/m.exec(user.split("Allowed facts:")[1] ?? "")?.[1];
  return {
    content: JSON.stringify({ text, fact_ids: fact ? [fact] : [] }),
    finishReason: "stop",
    totalTokens: 500
  };
}

function setup(complete: GenAiClient["complete"], models = [{ id: "gpt-oss:120b", digest: null }]) {
  let saved: Progress | null = null;
  const requests: string[] = [];
  const deps: GenerateDeps = {
    client: {
      listModels: () => Promise.resolve(models),
      complete: (request) => {
        requests.push(request.user);
        return complete(request);
      }
    },
    model: "gpt-oss:120b",
    clock,
    window: new TokenWindow(10_000_000, 60000, clock),
    random: () => 0.5,
    store: { load: () => saved, save: (p) => void (saved = structuredClone(p)) },
    log: () => undefined,
    retryFailed: false
  };
  return { deps, requests, saved: () => saved };
}

describe("generateAll", () => {
  it("generates all 126 keys and records the model once", async () => {
    const run = setup((request) => Promise.resolve(goodReply(request.user)));
    const progress = await generateAll(run.deps);
    expect(Object.keys(progress.items)).toHaveLength(126);
    expect(progress.header).toMatchObject({
      model: "gpt-oss:120b",
      promptVersion: PROMPT_VERSION,
      digest: null
    });
  });

  it("stops and lists what is there when the model is missing, generating nothing", async () => {
    const run = setup(
      () => Promise.reject(new Error("must not be called")),
      [{ id: "other:7b", digest: null }]
    );
    await expect(generateAll(run.deps)).rejects.toThrow(/other:7b/);
    expect(run.requests).toEqual([]);
  });

  it("skips what is already completed on a rerun", async () => {
    const first = setup((request) => Promise.resolve(goodReply(request.user)));
    await generateAll(first.deps);
    const second = setup(() => Promise.reject(new Error("must not be called")));
    second.deps.store = { load: first.saved, save: () => undefined };
    await generateAll(second.deps);
    expect(second.requests).toEqual([]);
  });

  it("refuses a rerun from a different run", async () => {
    const first = setup((request) => Promise.resolve(goodReply(request.user)));
    await generateAll(first.deps);
    const second = setup((request) => Promise.resolve(goodReply(request.user)));
    const saved = first.saved();
    if (saved) saved.header.promptVersion = "0";
    second.deps.store = { load: () => saved, save: () => undefined };
    await expect(generateAll(second.deps)).rejects.toThrow(/different run/);
  });

  it("retries a failing output twice, then marks it failed with the reasons counted", async () => {
    const bad = {
      content: JSON.stringify({ text: "WCAG", fact_ids: [] }),
      finishReason: "stop",
      totalTokens: 10
    };
    const run = setup(() => Promise.resolve(bad));
    const progress = await generateAll(run.deps);
    const item = progress.items["body:low:normal:1"];
    expect(item.status).toBe("failed");
    expect(item.attempts).toBe(3);
    expect(item.attemptReasons).toHaveLength(3);
    expect(item.reasons).toContain("banned-term");
    expect(run.requests).toHaveLength(126 * 3);
  });

  it("treats empty content that ran out of room as a failed attempt, then recovers", async () => {
    let call = 0;
    const run = setup((request) => {
      call++;
      return Promise.resolve(
        call === 1
          ? { content: "", finishReason: "length", totalTokens: 1500 }
          : goodReply(request.user)
      );
    });
    const progress = await generateAll(run.deps);
    const first = progress.items["heading:low:normal:1"];
    expect(first.status).toBe("completed");
    expect(first.attemptReasons).toEqual([["empty-length"]]);
  });

  it("counts malformed output as a schema failure", async () => {
    const run = setup(() =>
      Promise.resolve({ content: "not json", finishReason: "stop", totalTokens: 5 })
    );
    const progress = await generateAll(run.deps);
    expect(progress.items["body:low:normal:1"].reasons).toEqual(["schema"]);
  });

  it("with a newer prompt, redoes only failed items and records both versions", async () => {
    const first = setup((request) => Promise.resolve(goodReply(request.user)));
    const done = await generateAll(first.deps);
    done.header.promptVersion = "1";
    // As if every item came from the older prompt, which recorded no version per item
    for (const entry of Object.values(done.items)) delete entry.promptVersion;
    done.items["body:low:normal:1"].status = "failed";
    const saved = structuredClone(done);
    const second = setup((request) => Promise.resolve(goodReply(request.user)));
    second.deps.store = { load: () => structuredClone(saved), save: () => undefined };
    await expect(generateAll(second.deps)).rejects.toThrow(/promptVersion/);
    second.deps.retryFailed = true;
    const progress = await generateAll(second.deps);
    expect(second.requests).toHaveLength(1);
    expect(progress.header.promptVersions).toEqual(["1", PROMPT_VERSION]);
    expect(progress.items["body:low:normal:1"].promptVersion).toBe(PROMPT_VERSION);
    expect(progress.items["body:high:normal:1"].promptVersion).toBe("1");
  });
});
