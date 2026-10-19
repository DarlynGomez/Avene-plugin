import { ROLE_SERVER } from "../../shared/roles/roleConfig";
import {
  readReply,
  type RoleServerReply,
  type RoleServerRequest
} from "../../shared/roles/roleRequest";

export type AskResult =
  /** The server answered, even if the answer is unsure or an HTTP error */
  | { kind: "reply"; reply: RoleServerReply; retryAfterSeconds: number | null }
  /** The server could not be reached or did not answer in time */
  | { kind: "transport"; reason: "refused" | "timeout" };

const unsure = (reason: string): RoleServerReply => ({
  label: "unsure",
  reason,
  model: null,
  ms: 0
});

function retryAfter(response: Response): number | null {
  const value = Number(response.headers.get("retry-after"));
  return response.headers.get("retry-after") !== null && Number.isFinite(value) ? value : null;
}

/**
 * Asks the role server, and never throws. Only a transport failure comes back as such, which is
 * the one thing that means the server is unavailable, a 5xx or an unsure reply is an ordinary answer
 */
export async function askRoleServer(
  request: RoleServerRequest,
  timeoutMs: number,
  fetchFn: typeof fetch = fetch
): Promise<AskResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(`${ROLE_SERVER.baseUrl}/v1/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    const after = retryAfter(response);
    if (response.status === 429)
      return { kind: "reply", reply: unsure("rate-limited"), retryAfterSeconds: after };
    if (!response.ok)
      return { kind: "reply", reply: unsure("unreachable"), retryAfterSeconds: after };
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { kind: "reply", reply: readReply(body), retryAfterSeconds: after };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return { kind: "transport", reason: aborted ? "timeout" : "refused" };
  } finally {
    clearTimeout(timer);
  }
}
