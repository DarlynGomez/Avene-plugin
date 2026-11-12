import { useEffect, useRef } from "react";

import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import styles from "./ModuleLessonView.module.css";

/**
 * The lesson as text: no video and no article link, which need the internet and a link out
 * When it opens, focus moves to its heading so a keyboard or screen reader reader starts at the lesson
 */
export function ModuleLessonView({ module }: { module: LearningModule }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <article className={styles.lesson} aria-labelledby={`${module.id}-title`}>
      <p className={styles.context}>{module.context}</p>
      <h3 ref={heading} tabIndex={-1} id={`${module.id}-title`} className={styles.title}>
        {module.title}
      </h3>
      <p className={styles.estimate}>{module.timeBudgetMinutes.reading} min read</p>
      <section className={styles.section} aria-label="Lesson">
        {module.lessonParagraphs.map((paragraph) => (
          <p key={paragraph} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </section>
      <section className={styles.section} aria-label="What you will learn">
        <h4 className={styles.heading}>What you will learn</h4>
        <ul className={styles.list}>
          {module.learningObjectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>
      <section className={styles.section} aria-label="Key takeaways">
        <h4 className={styles.heading}>Key takeaways</h4>
        <ul className={styles.list}>
          {module.keyTakeaways.map((takeaway) => (
            <li key={takeaway}>{takeaway}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
