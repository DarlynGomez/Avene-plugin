import { renderLines } from "../../shared/handoff/render";
import type { Audience, AudienceDoc } from "../../shared/handoff/types";
import { BlockCompare } from "./BlockCompare";
import styles from "./Handoff.module.css";
import type { useDrafts } from "./useDrafts";

interface DraftPanelProps {
  audience: Audience;
  doc: AudienceDoc;
  drafts: ReturnType<typeof useDrafts>;
}

/** Drafting by an AI is offered beside the template text and is never the default */
export function DraftPanel({ audience, doc, drafts }: DraftPanelProps) {
  return (
    <section className={styles.root} aria-label="Drafts by an AI">
      <h2 className={styles.title}>Drafts by an AI</h2>
      <p className={styles.helper}>
        An AI can reword the connecting words for this reader. It never sees your layer names,
        colors or notes. You read every sentence, and the template text stays unless you choose a
        draft.
      </p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          disabled={drafts.busy}
          onClick={() => void drafts.run(false)}
        >
          Draft this version
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={drafts.busy}
          onClick={() => void drafts.run(true)}
        >
          Prepare all versions
        </button>
      </div>
      <p className={styles.helper} role="status">
        {drafts.status}
      </p>
      {drafts.blocks.map((view) => {
        const section = doc.sections.find((s) => s.id === view.id);
        return (
          <BlockCompare
            key={view.id}
            audience={audience}
            view={view}
            templateLines={section ? renderLines(section.lines, doc.slots, audience) : []}
            onChoose={(chosen) => drafts.choose(view.id, chosen)}
            onEdit={(index, shown) => drafts.edit(view.id, index, shown)}
          />
        );
      })}
    </section>
  );
}
