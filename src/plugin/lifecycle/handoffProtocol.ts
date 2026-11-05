import type { HandoffPluginMessage, HandoffUiMessage } from "../../shared/handoff/handoffMessages";
import { setMeta } from "../../shared/handoff/metaStorage";
import { FEATURE_HANDOFF, handoffAllowed } from "../../shared/handoffFlags";
import { isStudyActive } from "../../shared/study/studyActive";
import { saveDraftCache } from "../handoff/adapter/draftCacheStore";
import { saveFileUrl, loadFileUrl } from "../handoff/adapter/fileUrlStore";
import { loadHandoffMeta, saveHandoffMeta } from "../handoff/adapter/metaStore";
import { exportAltCrop } from "../handoff/adapter/altCrop";
import { loadSuggestions, saveSuggestions } from "../handoff/adapter/altSuggestStore";
import { listImageLayers } from "../handoff/adapter/imageInventory";
import { setAltNote, setNodeNotes } from "../handoff/adapter/notesStore";
import { activeStudySession } from "../study/adapter/studySessionStore";
import { buildHandoffData } from "./handoffData";

type Reply = (message: HandoffPluginMessage) => void;

/** The flag is read first so a build with handoff off touches no storage at all, not even the session */
function handoffOpen(): boolean {
  return FEATURE_HANDOFF && handoffAllowed(FEATURE_HANDOFF, isStudyActive(activeStudySession()));
}

async function handle(message: HandoffUiMessage, reply: Reply): Promise<void> {
  switch (message.type) {
    case "HANDOFF_DATA_REQUEST":
      reply(await buildHandoffData());
      return;
    case "HANDOFF_ALT_INVENTORY_REQUEST":
      reply({ type: "HANDOFF_ALT_INVENTORY", layers: listImageLayers() });
      return;
    case "HANDOFF_ALT_CROP_REQUEST":
      reply(await exportAltCrop(message.nodeId));
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

/** Refuses every handoff message while handoff is off or a study session is active, with no read and no write */
export async function handleHandoffMessage(message: HandoffUiMessage, reply: Reply): Promise<void> {
  if (!handoffOpen()) {
    reply({ type: "HANDOFF_REFUSED" });
    return;
  }
  try {
    await handle(message, reply);
  } catch (error) {
    console.error("handleHandoffMessage: a handoff message could not be handled", error);
  }
}
