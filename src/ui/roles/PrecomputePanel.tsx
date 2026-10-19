import { saveTextFile } from "../study/downloadFile";
import type { PrecomputeUi } from "./usePrecomputeRun";
import styles from "./PrecomputePanel.module.css";

/** Shown instead of the issue panel while the researcher's role precompute command runs */
export function PrecomputePanel({ ui }: { ui: Exclude<PrecomputeUi, { status: "idle" }> }) {
  return (
    <main className={styles.panel} aria-label="Precompute roles">
      <h1 className={styles.title}>Precompute roles</h1>
      {ui.status === "running" && (
        <p role="status" className={styles.text}>
          Asking the role server, item {ui.index} of {ui.total}. Keep this window open.
        </p>
      )}
      {ui.status === "stopped" && (
        <p role="status" className={styles.text}>
          Stopped at item {ui.index} of {ui.total}: the role server could not be reached (
          {ui.reason}). Start it, then run the command again. Finished items are kept and are not
          repeated.
        </p>
      )}
      {ui.status === "done" && (
        <>
          <p role="status" className={styles.text}>
            Done. {ui.summary.completed} asked, {ui.summary.skipped} already settled,{" "}
            {ui.summary.failed} left for the next run, out of {ui.summary.total} text layers.
          </p>
          <button
            type="button"
            className={styles.button}
            onClick={() => saveTextFile("role-suggestions-report.csv", ui.summary.csv)}
          >
            Download report
          </button>
        </>
      )}
    </main>
  );
}
