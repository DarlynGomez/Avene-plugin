import type { ChangeEvent } from "react";

import { saveTextFile } from "../study/downloadFile";
import type { ReviewUi } from "./useRoleReview";
import { sendRole } from "./sendRole";
import styles from "./PrecomputePanel.module.css";

function readAndSend(event: ChangeEvent<HTMLInputElement>): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => sendRole({ type: "ROLE_REVIEW_IMPORT", csv: String(reader.result) });
  reader.readAsText(file);
}

/** Shown instead of the issue panel while a researcher's role review command runs */
export function ReviewPanel({ ui }: { ui: Exclude<ReviewUi, { status: "idle" }> }) {
  if (ui.status === "export") {
    return (
      <main className={styles.panel} aria-label="Export role suggestions">
        <h1 className={styles.title}>Export role suggestions</h1>
        <p role="status" className={styles.text}>
          {ui.count} text layers hold a suggestion. Set final label and reviewed to yes in the file,
          then use Import role review.
        </p>
        {ui.count > 0 && (
          <button
            type="button"
            className={styles.button}
            onClick={() => saveTextFile("role-suggestions.csv", ui.csv)}
          >
            Download suggestions
          </button>
        )}
      </main>
    );
  }
  const result = ui.result;
  return (
    <main className={styles.panel} aria-label="Import role review">
      <h1 className={styles.title}>Import role review</h1>
      <label className={styles.text}>
        Reviewed file{" "}
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={readAndSend}
          aria-label="Reviewed file"
        />
      </label>
      {result?.unreadable && (
        <p role="status" className={styles.text}>
          That file is not a role suggestions export.
        </p>
      )}
      {result && !result.unreadable && (
        <p role="status" className={styles.text}>
          Imported {result.imported}, removed {result.removed}. Skipped: not found {result.notFound}
          , layer changed since export {result.layerChanged}, label not on the list{" "}
          {result.labelNotOnList}.
        </p>
      )}
    </main>
  );
}
