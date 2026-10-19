import type { RolePluginMessage, RoleUiMessage } from "../../shared/roles/roleMessages";
import { precomputeResult, subscribePrecompute } from "../roles/adapter/precompute";
import { importReview, subscribeReview } from "../roles/adapter/review";
import { recordAnswer } from "../roles/roleAnswer";
import { storeLiveReply } from "../roles/roleLive";
import { buildRoleState } from "../roles/adapter/roleState";

/** Answers the panel's role messages, a failure here is logged and never reaches the participant */
export async function handleRoleMessage(
  message: RoleUiMessage,
  reply: (message: RolePluginMessage) => void
): Promise<void> {
  try {
    switch (message.type) {
      case "ROLE_QUERY":
        reply({ type: "ROLE_STATE", state: await buildRoleState(message.nodeId) });
        return;
      case "ROLE_SERVER_RESULT":
        await storeLiveReply(message.nodeId, message.reply);
        reply({ type: "ROLE_STATE", state: await buildRoleState(message.nodeId) });
        return;
      case "ROLE_ANSWER":
        await recordAnswer(message.nodeId, message.role, message.response);
        reply({ type: "ROLE_STATE", state: await buildRoleState(message.nodeId) });
        return;
      case "ROLE_PRECOMPUTE_SUBSCRIBE":
        await subscribePrecompute(reply);
        return;
      case "ROLE_REVIEW_SUBSCRIBE":
        await subscribeReview(reply);
        return;
      case "ROLE_REVIEW_IMPORT":
        await importReview(message.csv, reply);
        return;
      case "ROLE_PRECOMPUTE_RESULT":
        await precomputeResult(message.nodeId, message.reply, message.failure, reply);
        return;
    }
  } catch (error) {
    console.error("handleRoleMessage: a role message could not be handled", error);
  }
}
