import type { AiResetResult } from "../../../shared/handoff/alt/altMessages";
import { noteSource } from "../../../shared/handoff/noteStorage";
import { removeAnnotation } from "./annotationActions";
import { loadDraftCache, saveDraftCache } from "./draftCacheStore";
import { loadSuggestions, saveSuggestions } from "./altSuggestStore";
import { loadAllNotes, setNodeNotes } from "./notesStore";

/**
 * Development only: puts back what a model wrote and nothing the designer wrote
 * The AI text drafts, the saved alt text suggestions and the alt notes that came from a suggestion go
 * An annotation Avene wrote for such a note is taken off the layer first, when allowed, and counted if it stays
 */
export async function resetAiContent(removeAnnotations: boolean): Promise<AiResetResult> {
  const result: AiResetResult = {
    type: "HANDOFF_AI_RESET_RESULT",
    drafts: Object.keys(loadDraftCache()).length,
    suggestions: loadSuggestions().length,
    notes: 0,
    annotationsRemoved: 0,
    annotationsLeft: 0
  };
  saveDraftCache({});
  saveSuggestions([]);

  const fromModel = Object.entries(await loadAllNotes()).filter(([, notes]) =>
    notes.some((note) => note.category === "alt" && noteSource(note) !== "designer")
  );
  for (const [nodeId, notes] of fromModel) {
    if (notes.some((note) => note.category === "alt" && note.annotated)) {
      const removed = removeAnnotations ? await removeAnnotation(nodeId) : null;
      if (removed?.ok) result.annotationsRemoved += 1;
      else result.annotationsLeft += 1;
    }
    // Read again, taking the annotation off changed the note, and keep every note that is not the alt text
    const current = (await loadAllNotes())[nodeId] ?? [];
    const kept = await setNodeNotes(
      nodeId,
      current.filter((note) => note.category !== "alt")
    );
    if (kept.saved) result.notes += 1;
  }
  return result;
}
