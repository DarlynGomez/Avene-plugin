import { useState } from "react";

import { ROLE_LABELS, ROLE_MEANINGS, type RoleLabel } from "../../shared/roles/roleLabels";
import type { RoleStateView } from "../../shared/roles/roleMessages";
import type { RoleResponse } from "../../shared/roles/roleStorage";
import styles from "./RoleQuestion.module.css";

interface RoleQuestionProps {
  view: RoleStateView;
  onAnswer: (role: RoleLabel, response: RoleResponse) => void;
}

const CHOICES = [...ROLE_LABELS.filter((label) => label !== "unsure"), "unsure" as const];

function Picker({
  shown,
  onSave,
  onCancel
}: {
  shown: RoleLabel | null;
  onSave: (role: RoleLabel) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RoleLabel | null>(shown);
  return (
    <fieldset className={styles.picker} role="radiogroup">
      <legend className={styles.legend}>What kind of text is this?</legend>
      {CHOICES.map((label) => (
        <label key={label} className={styles.choice}>
          <input
            type="radio"
            name="text-role"
            value={label}
            checked={draft === label}
            onChange={() => setDraft(label)}
          />
          <span className={styles.name}>{label === "unsure" ? "Not sure" : label}</span>
          <span className={styles.meaning}>{ROLE_MEANINGS[label]}</span>
        </label>
      ))}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.primary}
          disabled={draft === null}
          onClick={() => draft && onSave(draft)}
        >
          Save
        </button>
        <button type="button" className={styles.quiet} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </fieldset>
  );
}

const sameAnswer = (a: RoleStateView["answer"], b: RoleStateView["answer"]) =>
  a?.role === b?.role && a?.response === b?.response;

/**
 * What kind of text this is, as a question, never a finding. A rule says why, a model suggestion is
 * labelled AI suggestion, and nothing is used until the participant confirms or changes it
 */
export function RoleQuestion({ view: latest, onAnswer }: RoleQuestionProps) {
  const [picking, setPicking] = useState(false);
  // The question as it was when the participant began to answer, so a suggestion that arrives late
  // changes neither the text nor what their choice counts as. Kept until their answer comes back
  const [held, setHeld] = useState<RoleStateView | null>(null);
  const view =
    held && held.nodeId === latest.nodeId && (picking || !sameAnswer(held.answer, latest.answer))
      ? held
      : latest;
  const shown: RoleLabel | null = view.rule?.role ?? view.suggestion?.label ?? null;

  function open() {
    setHeld(latest);
    setPicking(true);
  }

  function close() {
    setHeld(null);
    setPicking(false);
  }

  function save(role: RoleLabel) {
    const response: RoleResponse =
      role === "unsure" ? "unsure" : role === shown ? "confirmed" : "changed";
    onAnswer(role, response);
    setHeld({ ...view, answer: { role, response } });
    setPicking(false);
  }

  if (picking) {
    return (
      <section className={styles.box} aria-label="Kind of text">
        <Picker shown={view.answer?.role ?? shown} onSave={save} onCancel={close} />
      </section>
    );
  }
  return (
    <section className={styles.box} aria-label="Kind of text">
      {view.answer ? (
        <p className={styles.line}>
          You said <strong>{view.answer.role === "unsure" ? "not sure" : view.answer.role}</strong>.
        </p>
      ) : view.rule ? (
        <p className={styles.line}>
          Treated as <strong>{view.rule.role}</strong>. {view.rule.reason}
        </p>
      ) : view.suggestion ? (
        <>
          <p className={styles.line}>
            <span className={styles.tag}>AI suggestion</span> Is this text a{" "}
            <strong>{view.suggestion.label}</strong>?
          </p>
          <p className={styles.note}>
            A model looked at this text and made a guess. It can be wrong.
          </p>
        </>
      ) : (
        <p className={styles.line}>What kind of text is this?</p>
      )}
      <div className={styles.row}>
        {!view.answer && shown && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onAnswer(shown, "confirmed")}
          >
            {view.rule ? "That is right" : "Yes"}
          </button>
        )}
        <button type="button" className={styles.quiet} onClick={open}>
          {view.answer || shown ? "Change" : "Choose"}
        </button>
      </div>
    </section>
  );
}
