import { initialsOf } from "../../shared/calendar/settings";
import { useCalendar } from "./CalendarContext";
import { SettingsScreen } from "./SettingsScreen";
import styles from "./Settings.module.css";

/** The wordmark row with the way into settings, drawn only when the calendar is on */
export function SettingsPill() {
  const { available, userName, settingsOpen, openSettings } = useCalendar();
  if (!available) return null;
  return (
    <>
      <div className={styles.topRow}>
        <span className={styles.wordmark}>Avene</span>
        <button type="button" className={styles.pill} onClick={openSettings}>
          <span className={styles.initials} aria-hidden="true">
            {initialsOf(userName) || "?"}
          </span>
          Settings
        </button>
      </div>
      {settingsOpen && <SettingsScreen />}
    </>
  );
}
