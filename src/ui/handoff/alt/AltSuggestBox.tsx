import handoff from "../Handoff.module.css";
import type { SuggestionState } from "./suggestTypes";
import styles from "./AltSheet.module.css";

interface AltSuggestBoxProps {
  state: SuggestionState | undefined;
  onUse: (text: string) => void;
  onEdit: (text: string) => void;
  onDecorative: () => void;
  onDismiss: () => void;
}

/** What came back, labeled as a suggestion and never put in the field by itself */
export function AltSuggestBox({
  state,
  onUse,
  onEdit,
  onDecorative,
  onDismiss
}: AltSuggestBoxProps) {
  return (
    <div className={styles.suggest}>
      <div role="status">
        {state?.status === "none" && <p className={styles.sub}>{state.line}</p>}
      </div>
      {state?.status === "ready" && (
        <section className={styles.suggestion} aria-label="AI suggestion">
          <p className={styles.hintTitle}>AI suggestion</p>
          <p className={styles.suggestionText}>{state.text}</p>
          {state.warnings.includes("too-long") && (
            <p className={styles.sub}>A little long. Edit it if you can.</p>
          )}
          <div className={styles.annotationButtons}>
            <button type="button" className={handoff.primary} onClick={() => onUse(state.text)}>
              Use this
            </button>
            <button type="button" className={handoff.button} onClick={() => onEdit(state.text)}>
              Edit
            </button>
            <button type="button" className={handoff.button} onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </section>
      )}
      {state?.status === "decorative" && (
        <section className={styles.suggestion} aria-label="AI suggestion">
          <p className={styles.hintTitle}>AI suggestion</p>
          <p className={styles.suggestionText}>This image looks decorative.</p>
          <div className={styles.annotationButtons}>
            <button type="button" className={handoff.button} onClick={onDecorative}>
              Mark as decorative
            </button>
            <button type="button" className={handoff.button} onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
