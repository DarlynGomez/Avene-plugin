import { Copy, RotateCcw } from "lucide-react";
import { useId, useState } from "react";

import { ALT_MAX_CHARS } from "../../../shared/handoff/alt/altLimits";
import { NOTE_TEXT_MAX_CHARS } from "../../../shared/handoff/limits";
import { copyText } from "../../study/downloadFile";
import handoff from "../Handoff.module.css";
import styles from "./AltSheet.module.css";

interface AltDescriptionProps {
  id: string;
  text: string;
  decorative: boolean;
  onText: (value: string) => void;
  /** False while the live path is off, since asking again needs the server */
  canRegenerate: boolean;
  onRegenerate: () => void;
}

/** The description field with its counter, Copy, and a rewind button to ask for a new one at the chosen setting */
export function AltDescription({
  id,
  text,
  decorative,
  onText,
  canRegenerate,
  onRegenerate
}: AltDescriptionProps) {
  const hintId = useId();
  const [copied, setCopied] = useState("");
  const length = Array.from(text).length;
  return (
    <>
      <div className={styles.fieldHead}>
        <label className={handoff.label} htmlFor={`${id}-text`}>
          Description
        </label>
        <span className={styles.fieldTools}>
          <button
            type="button"
            className={styles.tool}
            aria-label="Generate again"
            title={canRegenerate ? "Generate again" : "Live suggestions are not turned on"}
            aria-disabled={!canRegenerate}
            onClick={() => {
              if (canRegenerate) onRegenerate();
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.tool}
            disabled={decorative || text.trim() === ""}
            onClick={async () =>
              setCopied((await copyText(text)) ? "Copied" : "Copying did not work here")
            }
          >
            <Copy size={14} aria-hidden="true" />
            <span>Copy</span>
          </button>
          <span className={styles.counter} aria-live="polite">
            {length}/{ALT_MAX_CHARS}
          </span>
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
        aria-describedby={hintId}
        onChange={(event) => {
          setCopied("");
          onText(event.target.value);
        }}
      />
      <p className={styles.sub} role="status">
        {copied}
      </p>
      {!decorative && length > ALT_MAX_CHARS && (
        <p className={styles.sub}>A little long. Shorter text is easier to listen to.</p>
      )}
      <div className={styles.hint} id={hintId}>
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
