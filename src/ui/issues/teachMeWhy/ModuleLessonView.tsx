import { useContext } from "react";

import { isStudyActive } from "../../../shared/study/studyActive";
import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { StudyStateContext } from "../../study/StudyStateContext";
import { ModuleVideo } from "./ModuleVideo";
import { useOnlineStatus } from "./useOnlineStatus";
import styles from "./ModuleLessonView.module.css";

export function ModuleLessonView({ module }: { module: LearningModule }) {
  const online = useOnlineStatus();
  const studyState = useContext(StudyStateContext);
  const externalResourcesAvailable = online && !isStudyActive(studyState?.session ?? null);

  return (
    <article className={styles.lesson} aria-labelledby={`${module.id}-title`}>
      <p className={styles.context}>{module.context}</p>
      <h3 id={`${module.id}-title`} className={styles.title}>
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
      <section className={styles.section} aria-label="Video">
        <h4 className={styles.heading}>Watch</h4>
        <p className={styles.publisher}>{module.video.publisher}</p>
        <ModuleVideo video={module.video} />
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
      {module.optionalArticle && (
        <section className={styles.section} aria-label="Keep learning">
          <h4 className={styles.heading}>Keep learning</h4>
          {externalResourcesAvailable ? (
            <a
              className={styles.articleLink}
              href={module.optionalArticle.url}
              target="_blank"
              rel="noreferrer"
            >
              {module.optionalArticle.title}
            </a>
          ) : (
            <p className={styles.unavailable}>
              {module.optionalArticle.title} is unavailable offline and during study sessions.
            </p>
          )}
        </section>
      )}
    </article>
  );
}
