export type CalendarFormat = "google" | "ics";
export type TriggerCount = 3 | 5 | "off";
export type SessionMinutes = 15 | 30 | 45;
export type SlotPreference = "morning" | "afternoon" | "custom";

export interface CalendarSettings {
  format: CalendarFormat;
  trigger: TriggerCount;
  minutes: SessionMinutes;
  slot: SlotPreference;
}

/** One root cause as a calendar event describes it */
export interface FocusItem {
  signature: string;
  /** Foreground on background, the way the card names it */
  name: string;
  measuredRatio: number;
  requiredRatio: number;
  foregroundHex: string;
  backgroundHex: string;
  binding: string | null;
  /** The layer the background was taken from */
  ancestor: string;
  layers: number;
  deferCount: number;
  nodeId: string;
}

export interface FocusEvent {
  title: string;
  body: string;
  start: Date;
  end: Date;
  /** The first deep link, when a file address is known */
  link: string | null;
}
