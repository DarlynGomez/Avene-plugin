import { useId, useRef, type KeyboardEvent } from "react";

import { type AltLayerView } from "../../../shared/handoff/alt/altRoots";
import { useAltChecks } from "./AltChecksContext";
import { AltNoteFields } from "./AltNoteFields";
import { AltSuggestBox } from "./AltSuggestBox";
import { AnnotationControl } from "./AnnotationControl";
import handoff from "../Handoff.module.css";
import sheet from "../HandoffSheet.module.css";
import { SheetHeader } from "../SheetHeader";
import { useSheetFocus } from "../useSheetFocus";
import styles from "./AltSheet.module.css";
import { useAltNoteForm } from "./useAltNoteForm";

interface AltNoteSheetProps {
  layer: AltLayerView;
  /** Every layer that uses the same picture, this one included */
  group: readonly AltLayerView[];
  startDecorative: boolean;
}

/** Writes the alt text for one layer, and for the others that use the picture only when asked */
export function AltNoteSheet({ layer, group, startDecorative }: AltNoteSheetProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const alt = useAltChecks();
  const form = useAltNoteForm(layer, group, startDecorative);
  useSheetFocus(ref, alt.closeSheet);

  const hadNote = layer.status !== "unanswered";
  const valid = form.decorative || form.text.trim() !== "" || hadNote;
  const dirty =
    form.text.trim() !== layer.text.trim() || form.decorative !== (layer.status === "decorative");
  const status = alt.statuses[layer.nodeId] ?? "none";

  // Escape closes only this sheet, so it does not also put a canvas selection back
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    alt.closeSheet();
  }

  return (
    <div
      ref={ref}
      className={sheet.sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-t`}
      onKeyDown={onKeyDown}
    >
      <SheetHeader id={`${id}-t`} title="Alt text" subtitle={layer.name} onClose={alt.closeSheet} />
      {layer.source !== "designer" && (
        <p className={styles.aiLabel}>
          {layer.source === "ai" ? "AI-drafted" : "AI-drafted, edited"}
        </p>
      )}
      <AltNoteFields
        text={form.text}
        decorative={form.decorative}
        onText={form.setText}
        onDecorative={form.setDecorative}
      />
      <AltSuggestBox
        state={alt.suggest.states[layer.nodeId]}
        onSuggest={() => alt.suggest.suggest(layer)}
        onUse={form.useSuggestion}
        onEdit={form.editSuggestion}
        onDecorative={form.markDecorative}
        onDismiss={() => alt.suggest.dismiss(layer.nodeId)}
      />
      {group.length > 1 && (
        <label className={styles.checkLine} htmlFor={`${id}-all`}>
          <input
            id={`${id}-all`}
            type="checkbox"
            checked={form.applyAll}
            onChange={(event) => form.setApplyAll(event.target.checked)}
          />
          <span className={styles.decorativeText}>
            Apply this note to all {group.length} layers
            <span className={styles.sub}>
              Off by default so each layer keeps its own words. Turn it on when the same picture
              says the same thing everywhere.
            </span>
          </span>
        </label>
      )}
      {alt.annotationsOn && hadNote && (
        <AnnotationControl
          status={status}
          source={layer.source}
          dirty={dirty}
          busy={alt.annotationBusy}
          error={alt.annotationError}
          onAdd={() => alt.annotate(layer.nodeId)}
          onUpdate={() => alt.updateAnnotation(layer.nodeId)}
          onRemove={() => alt.removeAnnotation(layer.nodeId)}
        />
      )}
      {alt.error && (
        <p className={handoff.error} role="alert">
          {alt.error}
        </p>
      )}
      <div className={sheet.footer}>
        <span />
        <span className={sheet.actions}>
          <button type="button" className={handoff.button} onClick={alt.closeSheet}>
            Cancel
          </button>
          <button type="button" className={handoff.primary} disabled={!valid} onClick={form.save}>
            Save alt text
          </button>
        </span>
      </div>
    </div>
  );
}
