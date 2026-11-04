import { createContext, useContext } from "react";

import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import type { CalendarSettings } from "../../shared/calendar/types";

export interface CalendarValue {
  /** False when the build has no calendar or a study session is running, nothing below then does anything */
  available: boolean;
  settings: CalendarSettings;
  counts: Readonly<Record<string, number>>;
  userName: string | null;
  fileUrl: string | null;
  /** The root whose deferral just reached the trigger, or one the designer opened by hand */
  pending: string | null;
  settingsOpen: boolean;
  noteDeferred: (signature: string) => void;
  requestState: (live: string[]) => void;
  openFor: (signature: string) => void;
  dismiss: () => void;
  scheduled: (signatures: string[]) => void;
  openUrl: (url: string) => void;
  saveSettings: (settings: CalendarSettings) => void;
  reset: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const nothing = () => undefined;

/** What a panel without a provider gets, so a card or a header can read it without checking */
export const INERT: CalendarValue = {
  available: false,
  settings: DEFAULT_SETTINGS,
  counts: {},
  userName: null,
  fileUrl: null,
  pending: null,
  settingsOpen: false,
  noteDeferred: nothing,
  requestState: nothing,
  openFor: nothing,
  dismiss: nothing,
  scheduled: nothing,
  openUrl: nothing,
  saveSettings: nothing,
  reset: nothing,
  openSettings: nothing,
  closeSettings: nothing
};

export const CalendarContext = createContext<CalendarValue>(INERT);

export function useCalendar(): CalendarValue {
  return useContext(CalendarContext);
}
