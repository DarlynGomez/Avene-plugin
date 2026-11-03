import { useLayoutEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";

import type { LearningModule } from "../../../shared/teachMeWhy/modules/moduleTypes";
import { ModuleLessonView } from "./ModuleLessonView";
import styles from "./ModuleDetailScreen.module.css";

interface ModuleDetailScreenProps {
  module: LearningModule;
  onBack: () => void;
}

export function ModuleDetailScreen({ module, onBack }: ModuleDetailScreenProps) {
  const screen = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    screen.current?.scrollIntoView?.({ block: "start" });
  }, []);

  return (
    <section ref={screen} className={styles.screen} aria-label={`${module.title} module`}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>All topics</span>
      </button>
      <ModuleLessonView module={module} />
    </section>
  );
}
