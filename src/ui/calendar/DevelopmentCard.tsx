import { useState } from "react";

import { useAltChecks } from "../handoff/alt/AltChecksContext";
import styles from "./Settings.module.css";
import { SettingsCard, SettingsRow } from "./SettingsRow";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Development only: starts a demo from scratch by clearing what a model wrote, asking once more before it does */
export function DevelopmentCard() {
  const { available, resetAi, resetResult } = useAltChecks();
  const [asking, setAsking] = useState(false);
  if (!available) return null;
  const done = resetResult
    ? `Cleared ${plural(resetResult.drafts, "text draft", "text drafts")}, ${plural(resetResult.suggestions, "saved suggestion", "saved suggestions")} and ${plural(resetResult.notes, "AI-drafted note", "AI-drafted notes")}.` +
      (resetResult.annotationsRemoved + resetResult.annotationsLeft > 0
        ? ` ${plural(resetResult.annotationsRemoved, "annotation", "annotations")} taken off the canvas, ${resetResult.annotationsLeft} left in place.`
        : "")
    : "";
  return (
    <SettingsCard
      title="Development"
      sub="Clears AI text drafts, saved alt text suggestions and AI-drafted alt notes. Notes you wrote yourself stay."
    >
      <SettingsRow label="Reset AI drafts" hint="Cannot be undone">
        {asking ? (
          <span className={styles.askRow}>
            <button
              type="button"
              className={styles.small}
              onClick={() => {
                resetAi();
                setAsking(false);
              }}
            >
              Confirm reset
            </button>
            <button type="button" className={styles.small} onClick={() => setAsking(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.small}
            aria-label="Reset AI drafts"
            onClick={() => setAsking(true)}
          >
            Reset
          </button>
        )}
      </SettingsRow>
      <p className={styles.hint} role="status">
        {done}
      </p>
    </SettingsCard>
  );
}
