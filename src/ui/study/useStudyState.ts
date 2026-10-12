import { useCallback, useEffect, useState } from "react";

import {
  isStudyExportReadyMessage,
  isStudyStateMessage
} from "../../shared/study/studyMessageGuards";
import type {
  StudyExportReadyMessage,
  StudyMessage,
  StudyStateMessage
} from "../../shared/study/studyMessageTypes";
import { saveTextFile } from "./downloadFile";

function post(message: StudyMessage) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

/** The latest study state and export file, asked for on mount so the startup push cannot be missed */
export function useStudyState() {
  const [state, setState] = useState<StudyStateMessage | null>(null);
  const [exportFile, setExportFile] = useState<StudyExportReadyMessage | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (isStudyStateMessage(message)) {
        setState(message);
      } else if (isStudyExportReadyMessage(message)) {
        setExportFile(message);
        // The file is offered as soon as it is ready, the panel keeps copy and save as a fallback
        saveTextFile(message.fileName, message.text);
      }
    }
    window.addEventListener("message", onMessage);
    post({ type: "STUDY_SUBSCRIBE" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const refresh = useCallback(() => post({ type: "STUDY_SUBSCRIBE" }), []);

  return { state, exportFile, send: post, refresh };
}
