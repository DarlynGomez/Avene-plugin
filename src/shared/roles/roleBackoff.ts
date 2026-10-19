import { ROLE_SERVER } from "./roleConfig";

/**
 * How long to wait before trying a rate limited item again
 * A Retry-After from the server is obeyed, otherwise the wait doubles each time with jitter, up to a cap
 */
export function backoffMs(
  attempt: number,
  retryAfterSeconds: number | null,
  random: () => number
): number {
  const cap = ROLE_SERVER.backoffCapMs;
  if (retryAfterSeconds !== null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(cap, retryAfterSeconds * 1000);
  }
  const grown = Math.min(cap, ROLE_SERVER.backoffBaseMs * 2 ** attempt);
  // Between half and the whole of the wait, so a run of items does not retry in step
  return Math.round(grown * (0.5 + random() * 0.5));
}
