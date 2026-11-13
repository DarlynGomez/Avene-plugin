import { bodyParts } from "../../../../shared/teachMeWhy/lessonParts";
import type { LearningModule } from "../../../../shared/teachMeWhy/modules/moduleTypes";
import { LessonCallout } from "./LessonCallout";
import styles from "./Lesson.module.css";

/** The lesson text: the first paragraph as the lead, and the callout card where its paragraph was */
export function LessonBody({ module }: { module: LearningModule }) {
  return (
    <section className={styles.body} aria-label="Lesson">
      {bodyParts(module).map((part) =>
        part.kind === "callout" && module.callout ? (
          <LessonCallout key={part.text} id={module.id} callout={module.callout} text={part.text} />
        ) : (
          <p key={part.text} className={part.kind === "lead" ? styles.lead : styles.paragraph}>
            {part.text}
          </p>
        )
      )}
    </section>
  );
}
