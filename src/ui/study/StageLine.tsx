import { studyStages } from "../../shared/study/studyStage";
import type { StudySession } from "../../shared/study/studyTypes";
import styles from "./StageLine.module.css";

const WORDS = { done: "Done", now: "Now", next: "Next" } as const;

interface StageLineProps {
  session: StudySession;
}

/** A read-only list of the stages, worked out from the session and never ticked by hand, shown only in the researcher panel */
export function StageLine({ session }: StageLineProps) {
  return (
    <ol className={styles.stages} aria-label="Study stage">
      {studyStages(session).map((stage) => (
        <li
          key={stage.id}
          className={styles[stage.state]}
          aria-current={stage.state === "now" ? "step" : undefined}
        >
          {stage.label} <span className={styles.word}>{WORDS[stage.state]}</span>
        </li>
      ))}
    </ol>
  );
}
