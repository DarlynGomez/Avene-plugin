import type { AudienceDoc } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";

interface GateNotesProps {
  doc: AudienceDoc;
  draftWarnings: readonly string[];
  /** Alt text notes a model drafted, which the copy says were reviewed by the name typed above */
  aiAltNotes?: number;
}

/** Everything the checks still have to say, in plain words, before anything is copied */
export function GateNotes({ doc, draftWarnings, aiAltNotes = 0 }: GateNotesProps) {
  return (
    <>
      {aiAltNotes > 0 && (
        <p className={styles.helper}>
          {aiAltNotes === 1
            ? "1 alt text note is AI-drafted."
            : `${aiAltNotes} alt text notes are AI-drafted.`}{" "}
          The copy says so, and names the reviewer above.
        </p>
      )}
      {draftWarnings.length > 0 && (
        <ul className={sheet.list} aria-label="Things to look at in the AI-drafted text">
          {draftWarnings.map((w) => (
            <li key={w} className={styles.error}>
              {w}
            </li>
          ))}
        </ul>
      )}
      {doc.warnings.length > 0 && (
        <ul className={sheet.list} aria-label="Things to look at">
          {doc.warnings.map((w) => (
            <li key={`${w.item}-${w.field}-${w.match}`} className={styles.error}>
              {`Your ${w.field} text holds ${w.kind === "hex" ? "a color code" : "a number"}: ${w.match}`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
