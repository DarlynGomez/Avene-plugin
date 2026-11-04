import {
  readDraftReply,
  type DraftServerReply,
  type DraftServerRequest
} from "../../shared/handoff/draftRequest";
import { ROLE_SERVER } from "../../shared/roles/roleConfig";

export type DraftAsk =
  /** The server answered, even if the answer is a failure with a reason */
  | { kind: "reply"; reply: DraftServerReply }
  /** The server could not be reached or did not answer in time, the one thing that means it is down */
  | { kind: "transport"; reason: "refused" | "timeout" };

/** A placeholder: one window of waiting plus the server's own timeout and some room, to tune with a measured run */
export const DRAFT_TIMEOUT_MS = 100000;

/** Asks the local server to reword one block, and never throws */
export async function askDraftServer(
  request: DraftServerRequest,
  timeoutMs: number = DRAFT_TIMEOUT_MS,
  fetchFn: typeof fetch = fetch
): Promise<DraftAsk> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`${ROLE_SERVER.baseUrl}/v1/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok)
      return { kind: "reply", reply: readDraftReply({ sentences: [], reason: "unreachable" }) };
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { kind: "reply", reply: readDraftReply(body) };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return { kind: "transport", reason: aborted ? "timeout" : "refused" };
  } finally {
    clearTimeout(timer);
  }
}
