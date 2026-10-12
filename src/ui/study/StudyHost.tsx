import { useEffect, type ReactNode } from "react";

import { ResearcherPanel } from "./ResearcherPanel";
import { StudyStateContext } from "./StudyStateContext";
import { useResearcherChord } from "./useResearcherChord";
import { useStudyState } from "./useStudyState";

interface StudyHostProps {
  children: ReactNode;
}

/** Sits above every screen so the chord works from calibration, consent and the issue panel alike */
export function StudyHost({ children }: StudyHostProps) {
  const { state, exportFile, send, refresh } = useStudyState();
  const { open, close } = useResearcherChord();

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  return (
    <StudyStateContext.Provider value={state}>
      {children}
      {open && (
        <ResearcherPanel state={state} exportFile={exportFile} onSend={send} onClose={close} />
      )}
    </StudyStateContext.Provider>
  );
}
