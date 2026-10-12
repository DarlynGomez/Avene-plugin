import { useRef } from "react";

import { isStudyActive } from "../../shared/study/studyActive";
import type {
  StudyExportReadyMessage,
  StudyMessage,
  StudyStateMessage
} from "../../shared/study/studyMessageTypes";
import { BlockControls } from "./BlockControls";
import { ExportResult } from "./ExportResult";
import { refusalText } from "./refusalText";
import styles from "./ResearcherPanel.module.css";
import { SessionLine } from "./SessionLine";
import { StartForm } from "./StartForm";
import { useFocusTrap } from "./useFocusTrap";

interface ResearcherPanelProps {
  state: StudyStateMessage | null;
  exportFile: StudyExportReadyMessage | null;
  onSend: (message: StudyMessage) => void;
  onClose: () => void;
}

/** Covers the whole panel while open and does not exist in the page while closed */
export function ResearcherPanel({ state, exportFile, onSend, onClose }: ResearcherPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef);
  const session = state?.session ?? null;

  return (
    <div
      ref={containerRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="researcher-title"
      tabIndex={-1}
    >
      <header className={styles.header}>
        <h2 id="researcher-title" className={styles.title}>
          Researcher controls
        </h2>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </header>

      <div className={styles.body}>
        {state === null && (
          <p className={styles.waiting}>Waiting for the plugin to report its state.</p>
        )}
        {state?.refusal && (
          <p role="alert" className={styles.refusal}>
            {refusalText(state.refusal)}
          </p>
        )}
        {session && <SessionLine session={session} />}
        {state && isStudyActive(session) && <BlockControls session={session} onSend={onSend} />}
        {exportFile && isStudyActive(session) && <ExportResult file={exportFile} />}
        {state && !isStudyActive(session) && <StartForm onSend={onSend} />}
      </div>
    </div>
  );
}
