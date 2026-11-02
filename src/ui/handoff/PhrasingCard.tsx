import { Check } from "lucide-react";
import { useId } from "react";

import { parseCardLine } from "../../shared/handoff/cardParse";
import { relabel, renderLines } from "../../shared/handoff/render";
import type { Audience, AudienceDoc } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import type { BlockView } from "./useDrafts";

interface PhrasingCardProps {
  audience: Audience;
  doc: AudienceDoc;
  view: BlockView;
  onChoose: (chosen: "template" | "model") => void;
  onEdit: (index: number, shown: string) => void;
}

/** A line as it reads, without the label or a trailing link, which the cards in the document already carry */
const reading = (line: string) => parseCardLine(line)?.text ?? line;

/** The template and the AI rewrite of one block side by side, click one to forward it */
export function PhrasingCard({ audience, doc, view, onChoose, onEdit }: PhrasingCardProps) {
  const id = useId();
  const section = doc.sections.find((s) => s.id === view.id);
  const ready = view.offer.state === "ready";
  const template = section ? renderLines(section.lines, doc.slots, audience) : [];
  const on = view.chosen === "model";
  const explain =
    view.offer.state === "stale"
      ? "Draft is from earlier findings"
      : view.offer.state === "rejected"
        ? "The saved draft did not pass the checks."
        : "No draft yet.";
  return (
    <section className={sheet.phrasing} aria-labelledby={`${id}-t`}>
      <div className={sheet.sectionRow}>
        <h4 id={`${id}-t`} className={sheet.phrasingTitle}>{`${view.title} phrasing`}</h4>
        <span className={sheet.active}>{`Active: ${on ? "AI Rewrite" : "Template"}`}</span>
      </div>
      <div className={sheet.pair}>
        <div
          className={`${sheet.phrase} ${!on ? sheet.phraseOn : ""}`}
          onClick={() => onChoose("template")}
        >
          <button
            type="button"
            className={sheet.phrasingHead}
            aria-pressed={!on}
            onClick={() => onChoose("template")}
          >
            <span>Template (Standard)</span>
            {!on && <Check size={16} aria-hidden="true" />}
          </button>
          <p className={sheet.phraseText}>{template.map(reading).join(" ")}</p>
        </div>
        <div
          className={`${sheet.phrase} ${on ? sheet.phraseOn : ""}`}
          onClick={() => ready && onChoose("model")}
        >
          <button
            type="button"
            className={sheet.phrasingHead}
            aria-pressed={on}
            disabled={!ready}
            onClick={() => onChoose("model")}
          >
            <span>
              AI Rewrite <span className={sheet.aiChip}>AI-DRAFTED</span>
            </span>
            {on && <Check size={16} aria-hidden="true" />}
          </button>
          {!ready && <p className={sheet.phraseText}>{explain}</p>}
          {ready && !on && <p className={sheet.phraseText}>{view.filled.map(reading).join(" ")}</p>}
          {ready &&
            on &&
            view.filled.map((line, i) => (
              <label key={i} className={sheet.sentence}>
                <span className={sheet.sentenceTag}>
                  {view.edited[i] ? "AI-drafted, edited" : "AI-drafted"}
                </span>
                <textarea
                  className={sheet.sentenceField}
                  aria-label={`${view.title}, sentence ${i + 1}`}
                  rows={3}
                  value={relabel(line, audience)}
                  onChange={(e) => onEdit(i, e.target.value)}
                />
              </label>
            ))}
        </div>
      </div>
      {view.note && (
        <p className={styles.error} role="alert">
          {view.note}
        </p>
      )}
      {view.warnings.length > 0 && (
        <ul className={sheet.list} aria-label={`Things to look at in ${view.title}`}>
          {view.warnings.map((w) => (
            <li key={w} className={styles.error}>
              {w}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
