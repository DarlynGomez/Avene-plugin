import { useState } from "react";

import type { StudyMessage } from "../../shared/study/studyMessageTypes";
import type { StudySession } from "../../shared/study/studyTypes";
import styles from "./BlockControls.module.css";
import { ConfirmStep } from "./ConfirmStep";

type Pending = "reveal" | "end" | "exit";

interface BlockControlsProps {
  session: StudySession;
  onSend: (message: StudyMessage) => void;
  onExport: () => void;
  onExit: () => void;
}

/** Each control appears only when it can be used, Reveal and End and Exit ask once first */
export function BlockControls({ session, onSend, onExport, onExit }: BlockControlsProps) {
  const [pending, setPending] = useState<Pending | null>(null);
  const live = session.condition === "live";
  const canReveal = !live && session.phase === "designing";
  const canEnd = live ? session.phase === "designing" : session.phase === "reviewing";
  const exitNote = session.phase === "ended" ? "" : "This block has not ended. ";

  function confirm(action: () => void) {
    setPending(null);
    action();
  }

  if (pending === "reveal") {
    return (
      <ConfirmStep
        message="Feedback will appear for the participant and this cannot be undone."
        confirmLabel="Reveal feedback"
        onConfirm={() => confirm(() => onSend({ type: "STUDY_REVEAL" }))}
        onCancel={() => setPending(null)}
      />
    );
  }
  if (pending === "end") {
    return (
      <ConfirmStep
        message="This ends the block. The participant will see that the task has ended."
        confirmLabel="End block"
        onConfirm={() => confirm(() => onSend({ type: "STUDY_END_BLOCK" }))}
        onCancel={() => setPending(null)}
      />
    );
  }
  if (pending === "exit") {
    return (
      <ConfirmStep
        message={`${exitNote}Exiting study mode keeps every recorded answer and returns the plugin to normal.`}
        confirmLabel="Exit study mode"
        onConfirm={() => confirm(onExit)}
        onCancel={() => setPending(null)}
      />
    );
  }

  return (
    <div className={styles.controls}>
      {canReveal && (
        <button type="button" className={styles.primary} onClick={() => setPending("reveal")}>
          Reveal feedback
        </button>
      )}
      {canEnd && (
        <button type="button" className={styles.primary} onClick={() => setPending("end")}>
          End block
        </button>
      )}
      <button type="button" className={styles.secondary} onClick={onExport}>
        Export block
      </button>
      <button type="button" className={styles.secondary} onClick={() => setPending("exit")}>
        Exit study mode
      </button>
      <p className={styles.note}>
        Export and Exit are not connected yet. They arrive in a later phase.
      </p>
    </div>
  );
}
