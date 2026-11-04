import { Sparkles } from "lucide-react";

import type { Audience, AudienceDoc } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { PhrasingCard } from "./PhrasingCard";
import type { useDrafts } from "./useDrafts";

interface DraftsSectionProps {
  audience: Audience;
  doc: AudienceDoc;
  drafts: ReturnType<typeof useDrafts>;
}

/** The AI part of the review: ask for drafts, then pick which phrasing of each block to forward */
export function DraftsSection({ audience, doc, drafts }: DraftsSectionProps) {
  const chosen = drafts.aiTitles.length;
  return (
    <section className={sheet.group} aria-label="Drafts by an AI">
      <div className={sheet.draftsHead}>
        <Sparkles size={16} aria-hidden="true" />
        <h3 className={sheet.sectionTitle}>Drafts by an AI</h3>
        <span className={sheet.draftsChip}>
          {chosen === 0
            ? "Template chosen by default"
            : `AI text chosen for ${chosen} ${chosen === 1 ? "block" : "blocks"}`}
        </span>
      </div>
      <p className={styles.helper}>
        Click a card to pick which phrasing to forward. The model only ever sees placeholders (no
        layer names, colors, or numbers).
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
      {drafts.blocks.map((view) => (
        <PhrasingCard
          key={view.id}
          audience={audience}
          doc={doc}
          view={view}
          onChoose={(c) => drafts.choose(view.id, c)}
          onEdit={(i, shown) => drafts.edit(view.id, i, shown)}
        />
      ))}
    </section>
  );
}
