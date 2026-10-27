import { useId } from "react";

import { relabel } from "../../shared/handoff/render";
import type { Audience } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import compare from "./BlockCompare.module.css";
import type { BlockView } from "./useDrafts";

interface BlockCompareProps {
  audience: Audience;
  view: BlockView;
  templateLines: readonly string[];
  onChoose: (chosen: "template" | "model") => void;
  onEdit: (index: number, shown: string) => void;
}

const EXPLAIN: Record<string, string> = {
  none: "",
  stale: "Draft is from earlier findings",
  rejected: "The saved draft did not pass the checks, so only the template text is offered."
};

/** Template text beside the AI draft for one block, every drafted sentence tagged and editable */
export function BlockCompare({
  audience,
  view,
  templateLines,
  onChoose,
  onEdit
}: BlockCompareProps) {
  const id = useId();
  const ready = view.offer.state === "ready";
  return (
    <section className={compare.block} aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className={styles.title}>
        {view.title}
      </h3>
      <div className={compare.columns}>
        <div className={compare.column}>
          <h4 className={styles.label}>Template text</h4>
          {templateLines.map((line) => (
            <p key={line} className={compare.line}>
              {line}
            </p>
          ))}
        </div>
        <div className={compare.column}>
          <h4 className={styles.label}>Drafted by an AI</h4>
          {ready ? (
            view.filled.map((line, i) => (
              <div key={i} className={compare.sentence}>
                <span className={compare.tag}>
                  {view.edited[i] ? "AI-drafted, edited" : "AI-drafted"}
                </span>
                <textarea
                  className={styles.input}
                  aria-label={`${view.title}, sentence ${i + 1}`}
                  rows={3}
                  value={relabel(line, audience)}
                  onChange={(e) => onEdit(i, e.target.value)}
                />
              </div>
            ))
          ) : (
            <p className={styles.helper}>{EXPLAIN[view.offer.state] || "No draft yet."}</p>
          )}
        </div>
      </div>
      {view.note && (
        <p className={styles.error} role="alert">
          {view.note}
        </p>
      )}
      {view.warnings.length > 0 && (
        <ul className={compare.warnings} aria-label={`Things to look at in ${view.title}`}>
          {view.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {ready && (
        <fieldset className={styles.field}>
          <legend className={styles.label}>{`Which text for ${view.title}?`}</legend>
          <label className={styles.choice}>
            <input
              type="radio"
              name={`${id}-pick`}
              checked={view.chosen === "template"}
              onChange={() => onChoose("template")}
            />
            Use the template text
          </label>
          <label className={styles.choice}>
            <input
              type="radio"
              name={`${id}-pick`}
              checked={view.chosen === "model"}
              onChange={() => onChoose("model")}
            />
            Use the AI-drafted text
          </label>
        </fieldset>
      )}
    </section>
  );
}
