import { useState, type FormEvent } from "react";

import { participantIdError, validateStartForm } from "../../shared/study/participantIdSchema";
import type { StudyMessage } from "../../shared/study/studyMessageTypes";
import styles from "./StartForm.module.css";

interface StartFormProps {
  onSend: (message: StudyMessage) => void;
}

/** Start is enabled only when the whole form validates and paper consent is ticked */
export function StartForm({ onSend }: StartFormProps) {
  const [participantId, setParticipantId] = useState("");
  const [block, setBlock] = useState("");
  const [task, setTask] = useState("");
  const [condition, setCondition] = useState("");
  const [consent, setConsent] = useState(false);

  const checked = validateStartForm({
    participantId,
    block: block === "" ? undefined : Number(block),
    task,
    condition,
    paperConsentSigned: consent
  });
  const idProblem = participantId === "" ? null : participantIdError(participantId);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (checked.ok) {
      onSend({ type: "STUDY_START_BLOCK", ...checked.value, paperConsentSigned: true });
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-label="Start block">
      <div className={styles.field}>
        <label htmlFor="study-participant-id">Participant ID</label>
        <input
          id="study-participant-id"
          className={styles.control}
          value={participantId}
          onChange={(event) => setParticipantId(event.target.value)}
          aria-describedby="study-participant-id-help"
          aria-invalid={idProblem !== null}
          autoComplete="off"
          spellCheck={false}
        />
        <p id="study-participant-id-help" className={idProblem ? styles.problem : styles.help}>
          {idProblem ?? "Letters, digits, hyphen and underscore, up to 32 characters"}
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor="study-block">Block</label>
        <select
          id="study-block"
          className={styles.control}
          value={block}
          onChange={(event) => setBlock(event.target.value)}
        >
          <option value="">Choose block</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="study-task">Task</label>
        <select
          id="study-task"
          className={styles.control}
          value={task}
          onChange={(event) => setTask(event.target.value)}
        >
          <option value="">Choose task</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="study-condition">Condition</label>
        <select
          id="study-condition"
          className={styles.control}
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
        >
          <option value="">Choose condition</option>
          <option value="live">Live</option>
          <option value="post-task">Post-task</option>
        </select>
      </div>

      <label className={styles.consent}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>Paper consent signed</span>
      </label>

      <button type="submit" className={styles.start} disabled={!checked.ok}>
        Start block
      </button>
    </form>
  );
}
