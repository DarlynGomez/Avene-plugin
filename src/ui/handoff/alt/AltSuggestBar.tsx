import { useAltChecks } from "./AltChecksContext";
import styles from "./Alt.module.css";

/**
 * The count on the left and the actions on the right: Prepare suggestions, then Suggest all
 * A run shows its progress in place of the count and a way to stop in place of the actions
 */
export function AltSuggestBar({ line }: { line: string }) {
  const { suggest, views, counts } = useAltChecks();
  const { run } = suggest;
  return (
    <div className={styles.suggestBar}>
      <p className={styles.line} role="status">
        {run ? `${run.done} of ${run.total}` : line}
      </p>
      <div className={styles.suggestActions}>
        {run ? (
          <button type="button" className={styles.secondary} onClick={suggest.cancel}>
            Cancel
          </button>
        ) : (
          <>
            {suggest.live && (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => suggest.prepare(views)}
              >
                Prepare suggestions
              </button>
            )}
            <button
              type="button"
              className={styles.primary}
              disabled={counts.layers === 0}
              onClick={() => suggest.suggestAll(views)}
            >
              Suggest all
            </button>
          </>
        )}
      </div>
      <div role="status" className={styles.suggestNote}>
        {suggest.note}
        {!suggest.live && !suggest.note && (
          <span>
            Live suggestions are not turned on. Saved suggestions are used where there are any.
          </span>
        )}
      </div>
    </div>
  );
}
