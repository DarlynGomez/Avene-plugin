import { keyToString } from "../../src/shared/teachMeWhy/explanationKey";
import { FACT_LIBRARY, isShippable, shippableFacts } from "../../src/shared/teachMeWhy/facts";
import type { GenAiClient } from "./client";
import { generateItem } from "./generateItem";
import { allKeys } from "./keys";
import { inputsHash, PROMPT_VERSION } from "./prompt";
import type { Clock, TokenWindow } from "./rateLimit";
import { withRateLimitRetry } from "./retry";
import type { ProgressStore } from "./progressStore";
import type { Progress, RunHeader } from "./types";

export interface GenerateDeps {
  client: GenAiClient;
  model: string;
  clock: Clock;
  window: TokenWindow;
  random: () => number;
  store: ProgressStore;
  log: (line: string) => void;
  retryFailed: boolean;
}

/** The model must be on the service's own list, nothing is substituted */
export async function confirmModel(client: GenAiClient, model: string) {
  const models = await client.listModels();
  const found = models.find((candidate) => candidate.id === model);
  if (!found) {
    const available = models.map((candidate) => candidate.id).join("\n  ");
    throw new Error(`GENAI_MODEL "${model}" is not on the service. Available:\n  ${available}`);
  }
  return found;
}

/** A newer prompt is allowed only to redo failed items, the rest keep the version that wrote them */
function checkRerun(existing: RunHeader, now: RunHeader, retryFailed: boolean): void {
  const fields: (keyof RunHeader)[] = ["model", "digest", "inputsHash"];
  if (!retryFailed) fields.push("promptVersion");
  const changed = fields.filter((field) => existing[field] !== now[field]);
  if (changed.length > 0) {
    throw new Error(
      `generated.json came from a different run (${changed.join(", ")}). Move it aside to start again.`
    );
  }
}

function adoptNewPrompt(progress: Progress): void {
  const old = progress.header.promptVersion;
  for (const item of Object.values(progress.items)) item.promptVersion ??= old;
  progress.header.promptVersions = [
    ...new Set([...(progress.header.promptVersions ?? [old]), PROMPT_VERSION])
  ];
  progress.header.promptVersion = PROMPT_VERSION;
}

/** Runs every key not already done, saving after each one so a stop loses nothing */
export async function generateAll(deps: GenerateDeps): Promise<Progress> {
  const found = await confirmModel(deps.client, deps.model);
  const header: RunHeader = {
    model: found.id,
    digest: found.digest,
    promptVersion: PROMPT_VERSION,
    inputsHash: inputsHash(FACT_LIBRARY.filter(isShippable)),
    generatedAt: new Date(deps.clock.now()).toISOString()
  };
  const existing = deps.store.load();
  if (existing) checkRerun(existing.header, header, deps.retryFailed);
  const progress: Progress = existing ?? { header, items: {} };
  const redoing = Object.values(progress.items).some((item) => item.status === "failed");
  if (existing && deps.retryFailed && redoing && existing.header.promptVersion !== PROMPT_VERSION) {
    adoptNewPrompt(progress);
  }
  const retry = {
    maxRetries: 6,
    baseMs: 2000,
    capMs: 60000,
    random: deps.random,
    clock: deps.clock
  };
  const send: GenAiClient["complete"] = (request) =>
    withRateLimitRetry(() => deps.client.complete(request), retry);

  const keys = allKeys();
  for (const [index, key] of keys.entries()) {
    const name = keyToString(key);
    const done = progress.items[name];
    if (done && (done.status === "completed" || !deps.retryFailed)) continue;
    const beforeSend = async (estimate: number) => {
      const hold = await deps.window.reserve(estimate);
      return (actual: number) => deps.window.settle(hold, actual);
    };
    progress.items[name] = {
      ...(await generateItem(key, shippableFacts(key), send, beforeSend)),
      promptVersion: PROMPT_VERSION
    };
    deps.store.save(progress);
    deps.log(`${index + 1}/${keys.length} ${name} ${progress.items[name].status}`);
  }
  return progress;
}
