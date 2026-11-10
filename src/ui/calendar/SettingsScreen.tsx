import { ArrowLeft, CalendarDays, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useId, useRef, useState } from "react";

import { SAMPLE_ITEM } from "../../shared/calendar/sample";
import { initialsOf } from "../../shared/calendar/settings";
import { useSheetFocus } from "../handoff/useSheetFocus";
import { SheetOverlay } from "../issues/components/SheetOverlay";
import { useCalendar } from "./CalendarContext";
import { CalendarTab } from "./CalendarTab";
import { PreferencesTab, StandardsTab } from "./OtherTabs";
import { ScheduleSheet } from "./ScheduleSheet";
import styles from "./Settings.module.css";

type Tab = "calendar" | "standards" | "preferences";

const TABS = [
  { id: "calendar", text: "Calendar & Focus", Icon: CalendarDays },
  { id: "standards", text: "Accessibility", Icon: ShieldCheck },
  { id: "preferences", text: "Preferences", Icon: SlidersHorizontal }
] as const;

/** The settings page, replaced by the sample event while the designer tries event generation */
export function SettingsScreen() {
  const calendar = useCalendar();
  const [testing, setTesting] = useState(false);
  if (testing) {
    const done = () => setTesting(false);
    return (
      <SheetOverlay>
        <ScheduleSheet
          items={[SAMPLE_ITEM]}
          settings={calendar.settings}
          fileUrl={calendar.fileUrl}
          onOpenUrl={calendar.openUrl}
          onScheduled={done}
          onClose={done}
        />
      </SheetOverlay>
    );
  }
  return <SettingsBody onTest={() => setTesting(true)} />;
}

function SettingsBody({ onTest }: { onTest: () => void }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("calendar");
  const { settings, userName, saveSettings, reset, closeSettings } = useCalendar();
  useSheetFocus(ref, closeSettings);
  return (
    <div
      ref={ref}
      className={styles.screen}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-t`}
    >
      <header className={styles.top}>
        <button type="button" className={styles.back} aria-label="Back" onClick={closeSettings}>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <h2 id={`${id}-t`} className={styles.title}>
          Settings
        </h2>
        {userName && (
          <span className={styles.who}>
            <span className={styles.initials} aria-hidden="true">
              {initialsOf(userName)}
            </span>
            {userName}
          </span>
        )}
      </header>
      <div className={styles.tabsWrap}>
        <div className={styles.tabs} role="group" aria-label="Settings sections">
          {TABS.map(({ id: key, text, Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              className={`${styles.tabButton} ${tab === key ? styles.tabOn : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon size={14} aria-hidden="true" />
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        {tab === "calendar" && (
          <CalendarTab settings={settings} onChange={saveSettings} onTest={onTest} />
        )}
        {tab === "standards" && <StandardsTab />}
        {tab === "preferences" && <PreferencesTab onReset={reset} />}
      </div>
    </div>
  );
}
