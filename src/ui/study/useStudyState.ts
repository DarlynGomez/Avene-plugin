import { useCallback, useEffect, useState } from "react";

import { isStudyStateMessage } from "../../shared/study/studyMessageGuards";
import type { StudyMessage, StudyStateMessage } from "../../shared/study/studyMessageTypes";

function post(message: StudyMessage) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

/** The latest study state from the sandbox, asked for on mount so the startup push cannot be missed */
export function useStudyState() {
  const [state, setState] = useState<StudyStateMessage | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (isStudyStateMessage(message)) {
        setState(message);
      }
    }
    window.addEventListener("message", onMessage);
    post({ type: "STUDY_SUBSCRIBE" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const refresh = useCallback(() => post({ type: "STUDY_SUBSCRIBE" }), []);

  return { state, send: post, refresh };
}
