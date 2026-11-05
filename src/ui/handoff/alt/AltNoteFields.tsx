import { useId } from "react";

import { ALT_MAX_CHARS } from "../../../shared/handoff/alt/altLimits";
import { NOTE_TEXT_MAX_CHARS } from "../../../shared/handoff/limits";
import handoff from "../Handoff.module.css";
import styles from "./AltSheet.module.css";

interface AltNoteFieldsProps {
  text: string;
  decorative: boolean;
  onText: (value: string) => void;
  onDecorative: (value: boolean) => void;
}

/** The decorative switch, the description with its counter, and a short word on what helps */
export function AltNoteFields({ text, decorative, onText, onDecorative }: AltNoteFieldsProps) {
  const id = useId();
  const length = Array.from(text).length;
  return (
    <>
      <div className={styles.decorativeCard}>
        <label className={styles.checkLine} htmlFor={`${id}-decorative`}>
          <input
            id={`${id}-decorative`}
            type="checkbox"
            checked={decorative}
            onChange={(event) => onDecorative(event.target.checked)}
          />
          <span className={styles.decorativeText}>
            This image is decorative
            <span className={styles.sub}>Screen readers will skip it, so it needs no text.</span>
          </span>
        </label>
      </div>
      <div className={styles.fieldHead}>
        <label className={handoff.label} htmlFor={`${id}-text`}>
          Description
        </label>
        <span className={styles.counter} aria-live="polite">
          {length}/{ALT_MAX_CHARS}
        </span>
      </div>
      <textarea
        id={`${id}-text`}
        className={styles.textarea}
        rows={3}
        maxLength={NOTE_TEXT_MAX_CHARS}
        value={decorative ? "" : text}
        disabled={decorative}
        placeholder="Describe what this image is for..."
        aria-describedby={`${id}-hint`}
        onChange={(event) => onText(event.target.value)}
      />
      {!decorative && length > ALT_MAX_CHARS && (
        <p className={styles.sub}>A little long. Shorter text is easier to listen to.</p>
      )}
      <div className={styles.hint} id={`${id}-hint`}>
        <p className={styles.hintTitle}>What makes useful alt text</p>
        <p className={styles.sub}>
          Say what the image is for, not only what it looks like. A picture of a cart that opens the
          checkout is better described as &quot;Review your cart&quot; than &quot;a shopping
          cart&quot;.
        </p>
      </div>
    </>
  );
}
