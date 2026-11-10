import { useAltChecks } from "./AltChecksContext";
import styles from "./Alt.module.css";

/** Suggestions for many pictures at once: one at a time, with its progress and a way to stop */
export function AltSuggestBar() {
  const { suggest, views, counts } = useAltChecks();
  const { run } = suggest;
  return (
    <div className={styles.suggestBar}>
      {run ? (
        <>
          <p className={styles.line} role="status">
            {run.done} of {run.total}
          </p>
          <button type="button" className={styles.secondary} onClick={suggest.cancel}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={styles.secondary}
            disabled={counts.layers === 0}
            onClick={() => suggest.suggestAll(views)}
          >
            Suggest for all unanswered
          </button>
          {suggest.live && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => suggest.prepare(views)}
            >
              Prepare suggestions
            </button>
          )}
        </>
      )}
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
