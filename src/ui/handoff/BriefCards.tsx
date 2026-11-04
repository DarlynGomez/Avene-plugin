import { parseCardLine } from "../../shared/handoff/cardParse";
import { renderPmSummary } from "../../shared/handoff/pmSummary";
import type { HandoffInput } from "../../shared/handoff/types";
import styles from "./Document.module.css";

const HEADINGS = ["Scope", "Decision needed", "Not yet verified"];

/** The three lines for a product manager, numbered and headed so each one says what it is for */
export function BriefCards({ input }: { input: HandoffInput }) {
  return (
    <div className={styles.scroll} aria-label="Three-line brief">
      {renderPmSummary(input).map((line, i) => {
        const parsed = parseCardLine(line);
        return (
          <p key={line} className={styles.step}>
            <strong>{`${i + 1}. ${HEADINGS[i] ?? ""}`}</strong>
            <span>{parsed ? parsed.text : line}</span>
          </p>
        );
      })}
    </div>
  );
}
