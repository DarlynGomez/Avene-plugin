import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  isCalendarPluginMessage,
  settingsOf,
  type CalendarStateMessage,
  type CalendarUiMessage
} from "../../shared/calendar/calendarMessages";
import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import { isDue } from "../../shared/calendar/suggest";
import type { CalendarSettings } from "../../shared/calendar/types";
import { FEATURE_CALENDAR, calendarAllowed } from "../../shared/calendarFlags";
import { isStudyActive } from "../../shared/study/studyActive";
import { StudyStateContext } from "../study/StudyStateContext";
import type { CalendarValue } from "./CalendarContext";

function send(message: CalendarUiMessage) {
  window.parent.postMessage({ pluginMessage: message }, "*");
}

/** The calendar's state from the sandbox, and the actions that change it */
export function useCalendarState(): CalendarValue {
  const study = useContext(StudyStateContext);
  const available = calendarAllowed(FEATURE_CALENDAR, isStudyActive(study?.session ?? null));
  const [state, setState] = useState<CalendarStateMessage | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // The root just deferred, so the next state can say whether it reached the trigger
  const awaiting = useRef<string | null>(null);

  useEffect(() => {
    if (!available) return undefined;
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isCalendarPluginMessage(message) || message.type !== "CALENDAR_STATE") return;
      setState(message);
      const signature = awaiting.current;
      awaiting.current = null;
      if (signature && isDue(message.counts[signature] ?? 0, settingsOf(message).trigger)) {
        setPending(signature);
      }
    }
    window.addEventListener("message", onMessage);
    send({ type: "CALENDAR_STATE_REQUEST", live: [] });
    return () => window.removeEventListener("message", onMessage);
  }, [available]);

  const noteDeferred = useCallback(
    (signature: string) => {
      if (!available) return;
      awaiting.current = signature;
      send({ type: "CALENDAR_DEFERRED", signature });
    },
    [available]
  );
  const requestState = useCallback(
    (live: string[]) => available && send({ type: "CALENDAR_STATE_REQUEST", live }),
    [available]
  );
  const scheduled = useCallback(
    (signatures: string[]) => {
      setPending(null);
      if (available) send({ type: "CALENDAR_SCHEDULED", signatures });
    },
    [available]
  );
  const saveSettings = useCallback(
    (settings: CalendarSettings) => {
      if (!available) return;
      setState((previous) => (previous ? { ...previous, settings } : previous));
      send({ type: "CALENDAR_SETTINGS_SET", settings });
    },
    [available]
  );

  return useMemo(
    () => ({
      available,
      settings: state ? settingsOf(state) : DEFAULT_SETTINGS,
      counts: state?.counts ?? {},
      userName: state?.userName ?? null,
      fileUrl: state?.fileUrl ?? null,
      pending,
      settingsOpen,
      noteDeferred,
      requestState,
      openFor: setPending,
      dismiss: () => setPending(null),
      scheduled,
      openUrl: (url: string) => available && send({ type: "CALENDAR_OPEN_URL", url }),
      saveSettings,
      reset: () => available && send({ type: "CALENDAR_RESET" }),
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false)
    }),
    [available, state, pending, settingsOpen, noteDeferred, requestState, scheduled, saveSettings]
  );
}
