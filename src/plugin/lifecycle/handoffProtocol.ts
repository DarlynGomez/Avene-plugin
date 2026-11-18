import type { HandoffPluginMessage, HandoffUiMessage } from "../../shared/handoff/handoffMessages";
import { setMeta } from "../../shared/handoff/metaStorage";
import { FEATURE_ALT_ANNOTATIONS } from "../../shared/handoffFlags";
import {
  buildAltAnswered,
  buildAltSuggestionRequested
} from "../../shared/study/answerStudyEvents";
import { saveDraftCache } from "../handoff/adapter/draftCacheStore";
import { saveFileUrl, loadFileUrl } from "../handoff/adapter/fileUrlStore";
import { loadHandoffMeta, saveHandoffMeta } from "../handoff/adapter/metaStore";
import { exportAltCrop } from "../handoff/adapter/altCrop";
import { loadSuggestions, saveSuggestions } from "../handoff/adapter/altSuggestStore";
import { resetAiContent } from "../handoff/adapter/resetAiContent";
import { listImageLayers } from "../handoff/adapter/imageInventory";
import { setAltNote, setNodeNotes } from "../handoff/adapter/notesStore";
import { emitStudy } from "../study/adapter/studyEmitter";
import { handoffAccess, messageAllowed, type HandoffAccess } from "./handoffAccess";
import { buildAltNotesData, buildHandoffData } from "./handoffData";

type Reply = (message: HandoffPluginMessage) => void;

async function handle(
  message: HandoffUiMessage,
  reply: Reply,
  access: HandoffAccess
): Promise<void> {
  switch (message.type) {
    case "HANDOFF_DATA_REQUEST":
      reply(access === "alt" ? await buildAltNotesData() : await buildHandoffData());
      return;
    case "HANDOFF_ALT_INVENTORY_REQUEST":
      reply({ type: "HANDOFF_ALT_INVENTORY", layers: listImageLayers() });
      return;
    case "HANDOFF_ALT_CROP_REQUEST": {
      const crop = await exportAltCrop(message.nodeId);
      // Logged only in a session, and only a crop that was made, since only that one can be sent on
      const at = new Date().toISOString();
      if (access === "alt" && crop.ok) {
        emitStudy((ctx) => [buildAltSuggestionRequested(ctx, at, message.nodeId)]);
      }
      reply(crop);
      return;
    }
    case "HANDOFF_AI_RESET":
      // An annotation is taken off only where annotations are allowed, which handoff being open already settles for a study
      reply(await resetAiContent(FEATURE_ALT_ANNOTATIONS));
      return;
    case "HANDOFF_ALT_CACHE_REQUEST":
      reply({ type: "HANDOFF_ALT_CACHE", entries: loadSuggestions() });
      return;
    case "HANDOFF_ALT_CACHE_SET": {
      const { entries, ...result } = saveSuggestions(message.entries);
      reply({ type: "HANDOFF_ALT_CACHE", entries, ...result });
      return;
    }
    case "HANDOFF_ALT_SET": {
      const { nodeId, ...answer } = message;
      const result = await setAltNote(nodeId, answer);
      // Logged only in a session, and never the words
      const at = new Date().toISOString();
      if (access === "alt" && result.saved) {
        emitStudy((ctx) => [buildAltAnswered(ctx, at, nodeId, answer)]);
      }
      reply({ type: "HANDOFF_WRITE_RESULT", target: "notes", nodeId, ...result });
      return;
    }
    case "HANDOFF_NOTES_SET": {
      const result = await setNodeNotes(message.nodeId, message.notes);
      reply({ type: "HANDOFF_WRITE_RESULT", target: "notes", nodeId: message.nodeId, ...result });
      return;
    }
    case "HANDOFF_META_SET": {
      const next = setMeta(loadHandoffMeta(), message.signature, message.meta);
      const live = message.live ? new Set([...message.live, message.signature]) : undefined;
      const { map, ...result } = saveHandoffMeta(next, live);
      reply({ type: "HANDOFF_WRITE_RESULT", target: "meta", meta: map, ...result });
      return;
    }
    case "HANDOFF_DRAFTS_SET": {
      const { cache, ...result } = saveDraftCache(message.drafts);
      reply({ type: "HANDOFF_WRITE_RESULT", target: "drafts", drafts: cache, ...result });
      return;
    }
    case "HANDOFF_FILE_URL_SET": {
      const result = saveFileUrl(message.url);
      reply({ type: "HANDOFF_WRITE_RESULT", target: "fileUrl", fileUrl: loadFileUrl(), ...result });
      return;
    }
  }
}

/**
 * Refuses every message the access does not allow with no read and no write: all of handoff while it is off,
 * and in a study session everything but the alt text checks, which follow what the participant may see
 */
export async function handleHandoffMessage(message: HandoffUiMessage, reply: Reply): Promise<void> {
  const access = handoffAccess();
  if (!messageAllowed(access, message)) {
    reply({ type: "HANDOFF_REFUSED" });
    return;
  }
  try {
    await handle(message, reply, access);
  } catch (error) {
    console.error("handleHandoffMessage: a handoff message could not be handled", error);
  }
}
