import { CalendarDays, Download, ExternalLink } from "lucide-react";

import type { CalendarFormat, FocusEvent } from "../../shared/calendar/types";
import { googleCalendarUrl } from "../../shared/calendar/googleUrl";
import { STUDY_BUILD } from "../../shared/studyBuild";
import styles from "./Schedule.module.css";

interface ScheduleButtonsProps {
  event: FocusEvent | null;
  format: CalendarFormat;
  onGoogle: (url: string) => void;
  onDownload: () => void;
}

/** The ways to hand the event to a calendar, the study build offers the file only so no Google link is built into it */
export function ScheduleButtons({ event, format, onGoogle, onDownload }: ScheduleButtonsProps) {
  const ics = (
    <button
      key="i"
      type="button"
      className={STUDY_BUILD ? styles.primary : styles.secondary}
      disabled={!event}
      onClick={onDownload}
    >
      <Download size={16} aria-hidden="true" />
      Download .ICS file (Outlook / Apple)
    </button>
  );
  if (STUDY_BUILD) return ics;
  const google = (
    <button
      key="g"
      type="button"
      className={styles.primary}
      disabled={!event}
      onClick={() => event && onGoogle(googleCalendarUrl(event))}
    >
      <CalendarDays size={16} aria-hidden="true" />
      Open in Google Calendar
      <ExternalLink size={14} aria-hidden="true" />
    </button>
  );
  return <>{format === "google" ? [google, ics] : [ics, google]}</>;
}
