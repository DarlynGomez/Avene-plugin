import { ROLE_SERVER } from "../../shared/roles/roleConfig";
import { backoffMs } from "../../shared/roles/roleBackoff";
import type { RoleServerReply, RoleServerRequest } from "../../shared/roles/roleRequest";
import type { AskResult } from "./roleServerClient";

export interface PrecomputeDeps {
  ask: (request: RoleServerRequest, timeoutMs: number) => Promise<AskResult>;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
}

export type ItemOutcome =
  | { kind: "answered"; reply: RoleServerReply }
  /** The server could not be reached, the run stops here and the next run carries on */
  | { kind: "transport"; failure: "unreachable" | "timeout" };

/**
 * One item of a precompute run. A rate limited answer is retried with exponential backoff and jitter,
 * waiting as long as a Retry-After says when there is one, and still rate limited after the last try
 * is handed back as it is, to be left for the next run
 */
export async function runPrecomputeItem(
  request: RoleServerRequest,
  deps: PrecomputeDeps
): Promise<ItemOutcome> {
  for (let attempt = 0; ; attempt += 1) {
    const result = await deps.ask(request, ROLE_SERVER.precomputeTimeoutMs);
    if (result.kind === "transport") {
      return {
        kind: "transport",
        failure: result.reason === "timeout" ? "timeout" : "unreachable"
      };
    }
    const limited = result.reply.reason === "rate-limited";
    if (!limited || attempt + 1 >= ROLE_SERVER.precomputeMaxAttempts) {
      return { kind: "answered", reply: result.reply };
    }
    await deps.sleep(backoffMs(attempt, result.retryAfterSeconds, deps.random));
  }
}
