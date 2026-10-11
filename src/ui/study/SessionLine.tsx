import type { StudySession } from "../../shared/study/studyTypes";
import styles from "./SessionLine.module.css";

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

interface SessionLineProps {
  session: StudySession;
}

/** Who, which block and where it stands, with the times so far, shown only in the researcher panel */
export function SessionLine({ session }: SessionLineProps) {
  const conditionWord = session.condition === "live" ? "live" : "post-task";
  const times: [string, string][] = [["Started", time(session.startedAt)]];
  if (session.revealedAt) times.push(["Revealed", time(session.revealedAt)]);
  if (session.endedAt) times.push(["Ended", time(session.endedAt)]);
  if (session.exports.length > 0) times.push(["Exports", String(session.exports.length)]);
  if (session.exitedAt) times.push(["Exited", time(session.exitedAt)]);

  return (
    <section className={styles.line} aria-label="Current session">
      <p className={styles.summary}>
        Participant {session.participantId}, block {session.block}, task {session.task},{" "}
        {conditionWord}, {session.phase}
      </p>
      <ul className={styles.times}>
        {times.map(([label, value]) => (
          <li key={label}>
            {label} {value}
          </li>
        ))}
      </ul>
    </section>
  );
}
