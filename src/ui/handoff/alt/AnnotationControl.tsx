import {
  ANNOTATION_STATUS_TEXT,
  ANNOTATION_UNSUPPORTED_REASON
} from "../../../shared/handoff/alt/altCopy";
import type { AnnotationStatus } from "../../../shared/handoff/alt/annotationStatus";
import type { NoteSource } from "../../../shared/handoff/noteStorage";
import handoff from "../Handoff.module.css";
import styles from "./AltSheet.module.css";

interface AnnotationControlProps {
  status: AnnotationStatus;
  source: NoteSource;
  /** True while the text in the box is not what is saved, the annotation says what is saved */
  dirty: boolean;
  busy: boolean;
  error: string | null;
  onAdd: () => void;
  onUpdate: () => void;
  onRemove: () => void;
}

const HELPER =
  "Adds a note on this layer that everyone with the file can see, including in Dev Mode. Avene never adds it by itself.";
const FROM_MODEL = "This text was drafted by a model. The annotation will contain the text only.";

/**
 * The status of this layer's annotation and the buttons that fit it, each acts on this one note
 * The first button keeps its place whatever the status, so focus stays where the designer pressed
 */
export function AnnotationControl({
  status,
  source,
  dirty,
  busy,
  error,
  onAdd,
  onUpdate,
  onRemove
}: AnnotationControlProps) {
  const unsupported = status === "unsupported";
  const primary =
    status === "in-sync"
      ? { label: "Remove annotation", run: onRemove }
      : status === "out-of-date"
        ? { label: "Update annotation", run: onUpdate }
        : { label: "Add as annotation", run: onAdd };
  const blocked = busy || dirty;

  return (
    <section className={styles.annotation} aria-label="Annotation on the canvas">
      <p className={styles.annotationStatus}>Annotation: {ANNOTATION_STATUS_TEXT[status]}</p>
      {unsupported && <p className={styles.sub}>{ANNOTATION_UNSUPPORTED_REASON}</p>}
      <p className={styles.sub}>{HELPER}</p>
      {source !== "designer" && <p className={styles.sub}>{FROM_MODEL}</p>}
      {dirty && <p className={styles.sub}>Save the note first, then the annotation can use it.</p>}
      {!unsupported && (
        <div className={styles.annotationButtons}>
          <button
            type="button"
            className={handoff.button}
            aria-busy={busy}
            aria-disabled={blocked}
            onClick={() => {
              if (!blocked) primary.run();
            }}
          >
            {primary.label}
          </button>
          {status === "out-of-date" && (
            <button
              type="button"
              className={handoff.button}
              aria-disabled={blocked}
              onClick={() => {
                if (!blocked) onRemove();
              }}
            >
              Remove annotation
            </button>
          )}
        </div>
      )}
      {error && (
        <p className={handoff.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
