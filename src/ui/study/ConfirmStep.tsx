import styles from "./BlockControls.module.css";

interface ConfirmStepProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** One step, the plain consequence and a choice, used by Reveal, End and Exit */
export function ConfirmStep({ message, confirmLabel, onConfirm, onCancel }: ConfirmStepProps) {
  return (
    <div className={styles.confirm} role="group" aria-label="Confirm">
      <p className={styles.confirmMessage}>{message}</p>
      <div className={styles.row}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.primary} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
