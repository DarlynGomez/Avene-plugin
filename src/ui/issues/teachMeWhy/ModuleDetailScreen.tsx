import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { ArrowLeft } from "lucide-react";

import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { ModuleLessonView } from "./ModuleLessonView";
import styles from "./ModuleDetailScreen.module.css";

interface ModuleDetailScreenProps {
  module: LearningModule;
  onBack: () => void;
  /** Present only when the lesson was opened from an issue, it returns to that issue */
  onBackToIssue?: () => void;
}

export function ModuleDetailScreen({ module, onBack, onBackToIssue }: ModuleDetailScreenProps) {
  const screen = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    screen.current?.scrollIntoView?.({ block: "start" });
  }, []);

  // Escape closes the lesson as the Back button does, and the caller puts focus back on what opened it
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onBack();
  }

  return (
    <section
      ref={screen}
      className={styles.screen}
      aria-label={`${module.title} module`}
      onKeyDown={onKeyDown}
    >
      <div className={styles.backRow}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft className={styles.icon} size={16} aria-hidden="true" />
          <span>All topics</span>
        </button>
        {onBackToIssue && (
          <button type="button" className={styles.toIssue} onClick={onBackToIssue}>
            Back to issue
          </button>
        )}
      </div>
      <ModuleLessonView module={module} />
    </section>
  );
}
