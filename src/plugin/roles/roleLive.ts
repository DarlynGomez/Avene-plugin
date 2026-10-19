import type { RoleServerReply } from "../../shared/roles/roleRequest";
import { inputKeyOf } from "../../shared/roles/roleStorage";
import { writeSuggestion } from "./adapter/roleData";
import { roleGate } from "./roleGate";
import { inputsFor, textNodeById } from "./adapter/roleState";

/**
 * Keeps what the server said about a layer, so the same layer is not asked about again
 * Only a reply that came back ok is kept, a failure stores nothing and the layer simply has no suggestion
 */
export async function storeLiveReply(nodeId: string, reply: RoleServerReply): Promise<void> {
  if (!roleGate().liveAllowed || reply.reason !== "ok") return;
  const node = await textNodeById(nodeId);
  if (!node) return;
  writeSuggestion(node, {
    label: reply.label,
    source: "ai",
    model: reply.model,
    reviewed: false,
    live: true,
    inputKey: inputKeyOf(await inputsFor(node)),
    at: new Date().toISOString()
  });
}
