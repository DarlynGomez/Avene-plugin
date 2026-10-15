import { useEffect, useRef, useState } from "react";
import styles from "./IgnoreSheet.module.css";

const STARTING_POINTS = [
  "Decorative text; the same information appears elsewhere at full contrast",
  "Brand color required by guidelines; tracked for the next brand review",
  "Placeholder copy that will not ship"
];

interface IgnoreSheetProps {
  instanceCount: number;
  onRecord: (reason: string) => void;
  onCancel: () => void;
}

/**
 * The reason field opens empty and focused, starting points only insert text
 * Ignore stays disabled until there is real text and there is no fallback reason
 */
export function IgnoreSheet({ instanceCount, onRecord, onCancel }: IgnoreSheetProps) {
  const [reason, setReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canRecord = reason.trim().length > 0;
  const layerWord = instanceCount === 1 ? "layer" : "layers";

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function insertStartingPoint(text: string) {
    setReason(text);
    textareaRef.current?.focus();
  }

  return (
    <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="ignore-title">
      <h2 id="ignore-title" className={styles.title}>
        Why is this contrast intentional?
      </h2>
      <p className={styles.subtitle}>
        Your reason is saved with this decision. If the contrast gets worse later, CADT will ask
        again.
      </p>

      <textarea
        ref={textareaRef}
        className={styles.reasonField}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Type your reason"
        rows={4}
      />

      <div className={styles.startingPoints}>
        {STARTING_POINTS.map((point) => (
          <button
            key={point}
            type="button"
            className={styles.chip}
            onClick={() => insertStartingPoint(point)}
          >
            {point}
          </button>
        ))}
      </div>

      <p className={styles.scope}>
        This applies to all {instanceCount} {layerWord}.
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.ignoreButton}
          disabled={!canRecord}
          onClick={() => onRecord(reason)}
        >
          Ignore issue
        </button>
      </div>
    </div>
  );
}
