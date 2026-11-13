import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft } from "lucide-react";

import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { ModuleLessonView } from "./ModuleLessonView";
import { LessonQuiz } from "./quiz/LessonQuiz";
import styles from "./ModuleDetailScreen.module.css";

interface ModuleDetailScreenProps {
  module: LearningModule;
  onBack: () => void;
  /** Present only when the lesson was opened from an issue, it returns to that issue */
  onBackToIssue?: () => void;
}

export function ModuleDetailScreen({ module, onBack, onBackToIssue }: ModuleDetailScreenProps) {
  const screen = useRef<HTMLElement>(null);
  // The quiz takes the lesson's place, and its back control and Escape return to the lesson
  const [quizOpen, setQuizOpen] = useState(false);
  const back = quizOpen ? () => setQuizOpen(false) : onBack;

  useLayoutEffect(() => {
    screen.current?.scrollIntoView?.({ block: "start" });
  }, [quizOpen]);

  // Escape closes the lesson as the Back button does, and the caller puts focus back on what opened it
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    back();
  }

  return (
    <section
      ref={screen}
      className={styles.screen}
      aria-label={`${module.title} module`}
      onKeyDown={onKeyDown}
    >
      <div className={styles.backRow}>
        <button type="button" className={styles.back} onClick={back}>
          <ArrowLeft className={styles.icon} size={16} aria-hidden="true" />
          <span>{quizOpen ? "Back to lesson" : "All topics"}</span>
        </button>
        {onBackToIssue && (
          <button type="button" className={styles.toIssue} onClick={onBackToIssue}>
            Back to issue
          </button>
        )}
      </div>
      {quizOpen ? (
        <LessonQuiz module={module} onBackToLesson={() => setQuizOpen(false)} />
      ) : (
        <ModuleLessonView module={module} onStartQuiz={() => setQuizOpen(true)} />
      )}
    </section>
  );
}
