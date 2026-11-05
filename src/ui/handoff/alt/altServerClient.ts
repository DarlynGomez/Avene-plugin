import {
  readAltReply,
  type AltServerReply,
  type AltServerRequest
} from "../../../shared/handoff/alt/altSuggestion";
import { ROLE_SERVER } from "../../../shared/roles/roleConfig";

export type AltAsk =
  /** The server answered, even if the answer is a failure with a reason */
  | { kind: "reply"; reply: AltServerReply }
  /** The server could not be reached or did not answer in time, the one thing that means it is down */
  | { kind: "transport"; reason: "refused" | "timeout" | "cancelled" };

/** A placeholder: one window of waiting plus the server's own timeout and some room, to tune with a measured run */
export const ALT_TIMEOUT_MS = 100000;

/** Asks the local server to describe one picture, and never throws */
export async function askAltServer(
  request: AltServerRequest,
  signal?: AbortSignal,
  timeoutMs: number = ALT_TIMEOUT_MS,
  fetchFn: typeof fetch = fetch
): Promise<AltAsk> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const stop = () => controller.abort();
  signal?.addEventListener("abort", stop);
  try {
    const response = await fetchFn(`${ROLE_SERVER.baseUrl}/v1/alt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) return { kind: "reply", reply: readAltReply({ reason: "unreachable" }) };
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { kind: "reply", reply: readAltReply(body) };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    if (aborted && signal?.aborted) return { kind: "transport", reason: "cancelled" };
    return { kind: "transport", reason: aborted ? "timeout" : "refused" };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}
