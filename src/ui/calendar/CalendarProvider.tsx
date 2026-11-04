import type { ReactNode } from "react";

import { CalendarContext } from "./CalendarContext";
import { useCalendarState } from "./useCalendarState";

/** Sits under the study host so the calendar can tell when a session is running */
export function CalendarProvider({ children }: { children: ReactNode }) {
  return <CalendarContext.Provider value={useCalendarState()}>{children}</CalendarContext.Provider>;
}
