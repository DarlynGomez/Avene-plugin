import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";

interface NoteFooterProps {
  canRemove: boolean;
  valid: boolean;
  onRemove: () => void;
  onCancel: () => void;
  onSave: () => void;
}

/** Remove on the left when there is something to remove, Cancel and Save on the right */
export function NoteFooter({ canRemove, valid, onRemove, onCancel, onSave }: NoteFooterProps) {
  return (
    <div className={sheet.footer}>
      <span>
        {canRemove && (
          <button type="button" className={styles.button} onClick={onRemove}>
            Remove this note
          </button>
        )}
      </span>
      <span className={sheet.actions}>
        <button type="button" className={styles.button} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.primary} disabled={!valid} onClick={onSave}>
          Save note
        </button>
      </span>
    </div>
  );
}
