import { useState } from "react";

import { sourceAfterEdit, type AltLayerView } from "../../../shared/handoff/alt/altRoots";
import type { NoteSource } from "../../../shared/handoff/noteStorage";
import { useAltChecks } from "./AltChecksContext";

/**
 * What the alt text sheet holds and does
 * A suggestion reaches a note only through Use this or Edit then Save, never by itself
 */
export function useAltNoteForm(
  layer: AltLayerView,
  group: readonly AltLayerView[],
  startDecorative: boolean
) {
  const alt = useAltChecks();
  const [text, setText] = useState(layer.text);
  const [decorative, setDecorative] = useState(startDecorative || layer.status === "decorative");
  const [applyAll, setApplyAll] = useState(false);
  // The suggestion the text came from, so an edit before saving is told apart from using it as it was
  const [aiOrigin, setAiOrigin] = useState<string | null>(null);

  const ids = () => (applyAll ? group.map((item) => item.nodeId) : [layer.nodeId]);

  function sourceFor(next: string): NoteSource {
    if (aiOrigin !== null) return next.trim() === aiOrigin.trim() ? "ai" : "ai_edited";
    return sourceAfterEdit(layer.source, layer.text, next);
  }

  function save() {
    alt.saveNote(ids(), {
      text: decorative ? "" : text,
      decorative,
      source: decorative ? "designer" : sourceFor(text)
    });
    alt.closeSheet();
  }

  return {
    text,
    setText,
    decorative,
    setDecorative,
    applyAll,
    setApplyAll,
    save,
    /** Saves the suggestion as it is, as an AI note */
    useSuggestion(suggested: string) {
      alt.saveNote(ids(), { text: suggested, decorative: false, source: "ai" });
      alt.suggest.dismiss(layer.nodeId);
      alt.closeSheet();
    },
    /** Puts the suggestion in the field to be changed, it is saved only when the designer saves */
    editSuggestion(suggested: string) {
      setText(suggested);
      setDecorative(false);
      setAiOrigin(suggested);
      alt.suggest.dismiss(layer.nodeId);
    },
    /** Ticks the decorative box for the designer to confirm with Save, nothing is saved here */
    markDecorative() {
      setDecorative(true);
      alt.suggest.dismiss(layer.nodeId);
    }
  };
}
