import { keyToString } from "../../src/shared/teachMeWhy/explanationKey";
import type { ExplanationKey } from "../../src/shared/teachMeWhy/explanationTypes";
import { eligibleFacts } from "../../src/shared/teachMeWhy/factEligibility";
import type { GenAiClient } from "./client";
import { generateItem } from "./generateItem";
import { allKeys } from "./keys";
import { inputsHash, PROMPT_VERSION } from "./prompt";
import type { Clock, TokenWindow } from "./rateLimit";
import { withRateLimitRetry } from "./retry";
import type { ProgressStore } from "./progressStore";
import { markRepeats } from "./repeats";
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
  /** Only these keys, else all 126 */
  keys?: readonly ExplanationKey[];
  /** A fact id to build a key on, in place of every fact its row offers */
  forced?: Readonly<Record<string, string>>;
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
  const fields: (keyof RunHeader)[] = ["model", "digest"];
  // A redo may follow a change to the prompt or its inputs, the rows keep the version that wrote them
  if (!retryFailed) fields.push("inputsHash", "promptVersion");
  const changed = fields.filter((field) => existing[field] !== now[field]);
  if (changed.length > 0) {
    throw new Error(
      `generated.json came from a different run (${changed.join(", ")}). Move it aside to start again.`
    );
  }
}

function adoptNewPrompt(progress: Progress, inputsHashNow: string): void {
  const old = progress.header.promptVersion;
  for (const item of Object.values(progress.items)) item.promptVersion ??= old;
  progress.header.promptVersions = [
    ...new Set([...(progress.header.promptVersions ?? [old]), PROMPT_VERSION])
  ];
  progress.header.promptVersion = PROMPT_VERSION;
  progress.header.inputsHash = inputsHashNow;
}

/** The facts a key is offered, only the forced one when it has one and the row allows it */
function factsFor(key: ExplanationKey, name: string, forced?: Readonly<Record<string, string>>) {
  const offered = eligibleFacts(key);
  const id = forced?.[name];
  if (id === undefined) return offered;
  const fact = offered.find((candidate) => candidate.id === id);
  if (!fact) throw new Error(`${name} cannot be built on ${id}, its row does not offer it`);
  return [fact];
}

/** Runs every key not already done, saving after each one so a stop loses nothing */
export async function generateAll(deps: GenerateDeps): Promise<Progress> {
  const found = await confirmModel(deps.client, deps.model);
  const header: RunHeader = {
    model: found.id,
    digest: found.digest,
    promptVersion: PROMPT_VERSION,
    inputsHash: inputsHash(allKeys().flatMap((key) => eligibleFacts(key))),
    generatedAt: new Date(deps.clock.now()).toISOString()
  };
  const existing = deps.store.load();
  if (existing) checkRerun(existing.header, header, deps.retryFailed);
  const progress: Progress = existing ?? { header, items: {} };
  const redoing = Object.values(progress.items).some((item) => item.status === "failed");
  if (existing && deps.retryFailed && redoing && existing.header.promptVersion !== PROMPT_VERSION) {
    adoptNewPrompt(progress, header.inputsHash);
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

  const keys = deps.keys ?? allKeys();
  for (const [index, key] of keys.entries()) {
    const name = keyToString(key);
    const done = progress.items[name];
    if (done && (done.status === "completed" || !deps.retryFailed)) continue;
    const beforeSend = async (estimate: number) => {
      const hold = await deps.window.reserve(estimate);
      return (actual: number) => deps.window.settle(hold, actual);
    };
    progress.items[name] = {
      ...(await generateItem(
        key,
        factsFor(key, name, deps.forced),
        send,
        beforeSend,
        done?.messages ?? []
      )),
      promptVersion: PROMPT_VERSION
    };
    deps.store.save(progress);
    deps.log(`${index + 1}/${keys.length} ${name} ${progress.items[name].status}`);
  }
  for (const line of markRepeats(progress)) deps.log(`repeat found, ${line}`);
  deps.store.save(progress);
  return progress;
}
