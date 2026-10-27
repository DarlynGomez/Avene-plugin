import type { Audience, AudienceDoc } from "../../shared/handoff/types";
import { AUDIENCE_NAMES } from "./AudiencePicker";
import styles from "./Handoff.module.css";

interface DocumentViewProps {
  doc: AudienceDoc;
  audience: Audience;
  /** The text as it will be copied, with any chosen AI-drafted blocks in */
  text: string;
}

/** The text exactly as it will be copied, focusable so a keyboard user can scroll it */
export function DocumentView({ audience, text }: DocumentViewProps) {
  return (
    <pre
      className={styles.preview}
      tabIndex={0}
      aria-label={`Document for ${AUDIENCE_NAMES[audience].toLowerCase()}`}
    >
      {text}
    </pre>
  );
}
