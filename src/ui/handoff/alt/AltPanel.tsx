import { useMemo } from "react";

import {
  ALT_EMPTY_ALL_SET,
  ALT_EMPTY_NO_IMAGES,
  ALT_LOADING,
  altLine
} from "../../../shared/handoff/alt/altCopy";
import { sectionAltRoots, type AltGroupBy } from "../../../shared/handoff/alt/altRoots";
import type { GroupBy } from "../../../shared/grouping/sectionRoots";
import { SectionAccordion } from "../../issues/components/SectionAccordion";
import { useAltChecks } from "./AltChecksContext";
import { AltCard } from "./AltCard";
import { AltSuggestBar } from "./AltSuggestBar";
import styles from "./Alt.module.css";

/** The panel's one Group control has three choices, an image has no severity so it is listed by picture */
const altGroupOf = (groupBy: GroupBy): AltGroupBy =>
  groupBy === "screen" ? "screen" : "root-cause";

/** The alt text list, its own line and its own count, never added into the contrast numbers */
export function AltPanel({ groupBy }: { groupBy: GroupBy }) {
  const { views, counts, ready, error, pinned } = useAltChecks();
  const sections = useMemo(
    () =>
      sectionAltRoots(views, altGroupOf(groupBy)).map((section) => ({
        ...section,
        // Flagged pictures come first, the rest keep their order
        roots: [...section.roots].sort(
          (a, b) => Number(pinned.has(b.imageHash)) - Number(pinned.has(a.imageHash))
        )
      })),
    [views, groupBy, pinned]
  );

  let line = altLine(counts.layers, counts.screens);
  if (!ready) line = ALT_LOADING;
  else if (views.length === 0) line = ALT_EMPTY_NO_IMAGES;
  else if (counts.layers === 0) line = ALT_EMPTY_ALL_SET;

  return (
    <div className={styles.panel}>
      <p className={styles.line} role="status">
        {line}
      </p>
      {views.length > 0 && <AltSuggestBar />}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {sections.map((section) => {
        const cards = (
          <ul className={styles.list}>
            {section.roots.map((root) => (
              <AltCard key={`${section.key}:${root.imageHash}`} root={root} />
            ))}
          </ul>
        );
        if (!section.label) return <div key={section.key}>{cards}</div>;
        const open = section.roots.filter((root) => root.unanswered > 0);
        return (
          <SectionAccordion
            key={section.key}
            title={section.label}
            roots={open.length}
            issues={open.reduce((sum, root) => sum + root.unanswered, 0)}
          >
            {cards}
          </SectionAccordion>
        );
      })}
    </div>
  );
}
