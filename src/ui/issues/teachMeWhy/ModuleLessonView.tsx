import { useEffect, useRef } from "react";

import { readingMinutes } from "../../../shared/teachMeWhy/lessonParts";
import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { quizQuestionCount } from "../../../shared/teachMeWhy/modules/quizCounts";
import { STUDY_BUILD } from "../../../shared/studyBuild";
import { LessonBody } from "./lesson/LessonBody";
import { LessonObjectives } from "./lesson/LessonObjectives";
import { LessonResources } from "./lesson/LessonResources";
import { LessonTakeaways } from "./lesson/LessonTakeaways";
import { LessonVideo } from "./lesson/LessonVideo";
import styles from "./lesson/Lesson.module.css";

/**
 * The lesson page: header, what it teaches, the clip, the text, what to read next, and the takeaways last
 * The study build shows no clip and no link, nothing in it reaches the network
 * When it opens, focus moves to its heading so a keyboard or screen reader starts at the lesson
 */
export function ModuleLessonView({
  module,
  onStartQuiz
}: {
  module: LearningModule;
  onStartQuiz?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const titleId = `${module.id}-title`;

  return (
    <article className={styles.lesson} aria-labelledby={titleId}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Lesson · {readingMinutes(module)} min read</p>
        <h1 ref={heading} tabIndex={-1} id={titleId} className={styles.title}>
          {module.title}
        </h1>
        {module.subtitle && <p className={styles.subtitle}>{module.subtitle}</p>}
      </header>
      <LessonObjectives id={module.id} objectives={module.learningObjectives} />
      {!STUDY_BUILD && module.video && <LessonVideo id={module.id} video={module.video} />}
      <LessonBody module={module} />
      {module.optionalArticle && (
        <LessonResources id={module.id} article={module.optionalArticle} />
      )}
      <LessonTakeaways
        id={module.id}
        takeaways={module.keyTakeaways}
        questions={quizQuestionCount(module.id)}
        onStart={onStartQuiz}
      />
    </article>
  );
}
