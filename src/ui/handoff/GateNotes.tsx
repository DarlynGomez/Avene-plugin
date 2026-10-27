import type { AudienceDoc } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";

interface GateNotesProps {
  doc: AudienceDoc;
  aiTitles: readonly string[];
  draftWarnings: readonly string[];
}

/** What this version holds, which parts an AI wrote, and everything the checks still have to say */
export function GateNotes({ doc, aiTitles, draftWarnings }: GateNotesProps) {
  return (
    <>
      <p className={sheet.status}>
        This version has: {doc.sections.map((s) => s.title).join(", ")}.
      </p>
      <p className={sheet.status}>
        {aiTitles.length === 0
          ? "Text written by an AI: none. This version is template text only."
          : `Text written by an AI: ${aiTitles.join(", ")}. You are named as its reviewer.`}
      </p>
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
