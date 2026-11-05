import { useId, useMemo } from "react";

import {
  ALT_EMPTY_ALL_SET,
  ALT_EMPTY_NO_IMAGES,
  ALT_LOADING,
  altLine
} from "../../../shared/handoff/alt/altCopy";
import { sectionAltRoots } from "../../../shared/handoff/alt/altRoots";
import { useAltChecks } from "./AltChecksContext";
import { AltCard } from "./AltCard";
import styles from "./Alt.module.css";

interface AltPanelProps {
  /** Under the contrast list in All checks it gets a heading of its own, so the two read as separate */
  heading?: boolean;
}

/** The alt text view, its own line and its own count, never added into the contrast numbers */
export function AltPanel({ heading = false }: AltPanelProps) {
  const id = useId();
  const { views, counts, groupBy, ready, error } = useAltChecks();
  const sections = useMemo(() => sectionAltRoots(views, groupBy), [views, groupBy]);

  let line = altLine(counts.layers, counts.screens);
  if (!ready) line = ALT_LOADING;
  else if (views.length === 0) line = ALT_EMPTY_NO_IMAGES;
  else if (counts.layers === 0) line = ALT_EMPTY_ALL_SET;

  return (
    <section className={`${styles.panel} ${heading ? styles.separate : ""}`} aria-labelledby={id}>
      <h2 id={id} className={heading ? styles.heading : styles.srOnly}>
        Alt text &amp; Media Descriptions
      </h2>
      <p className={styles.line} role="status">
        {line}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {sections.map((section) => (
        <div key={section.key} className={styles.section}>
          {section.label && <h3 className={styles.sectionLabel}>{section.label}</h3>}
          <ul className={styles.list}>
            {section.roots.map((root) => (
              <AltCard key={`${section.key}:${root.imageHash}`} root={root} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
