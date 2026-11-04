import { ExternalLink } from "lucide-react";

import type { CalendarSettings } from "../../shared/calendar/types";
import { Segmented } from "./Segmented";
import styles from "./Settings.module.css";
import { SettingsCard, SettingsRow } from "./SettingsRow";

interface CalendarTabProps {
  settings: CalendarSettings;
  onChange: (settings: CalendarSettings) => void;
  onTest: () => void;
}

/** How the focus time reaches a calendar and when the offer appears, each change is saved at once */
export function CalendarTab({ settings, onChange, onTest }: CalendarTabProps) {
  const ready = (
    <span className={styles.ready}>
      <span className={styles.dot} aria-hidden="true" />
      Ready
    </span>
  );
  return (
    <>
      <SettingsCard
        title="Calendar connection"
        sub="Avene hands your calendar a link or a file. It never signs in."
        aside={ready}
      >
        <SettingsRow label="Format">
          <Segmented
            label="Calendar format"
            value={settings.format}
            choices={[
              { value: "google", text: "Google Calendar" },
              { value: "ics", text: "Outlook / .ics" }
            ]}
            onChange={(format) => onChange({ ...settings, format })}
          />
        </SettingsRow>
        <button type="button" className={styles.link} onClick={onTest}>
          <ExternalLink size={14} aria-hidden="true" />
          Test event generation
        </button>
      </SettingsCard>
      <SettingsCard
        title="Focus scheduling rules"
        sub="Offer review time when a contrast decision keeps getting deferred"
      >
        <SettingsRow label="Suggest block trigger" hint="After repeated deferrals">
          <Segmented
            label="Deferrals before the offer"
            value={settings.trigger}
            choices={[
              { value: 3, text: "3 times" },
              { value: 5, text: "5 times" },
              { value: "off", text: "Off" }
            ]}
            onChange={(trigger) => onChange({ ...settings, trigger })}
          />
        </SettingsRow>
        <SettingsRow label="Session duration" hint="One item always gets 15 min">
          <Segmented
            label="Minutes for a batch"
            value={settings.minutes}
            choices={[
              { value: 15, text: "15 min" },
              { value: 30, text: "30 min" },
              { value: 45, text: "45 min" }
            ]}
            onChange={(minutes) => onChange({ ...settings, minutes })}
          />
        </SettingsRow>
        <SettingsRow label="Suggested time slot">
          <Segmented
            label="Preferred time of day"
            value={settings.slot}
            choices={[
              { value: "morning", text: "Morning" },
              { value: "afternoon", text: "Afternoon" },
              { value: "custom", text: "Custom" }
            ]}
            onChange={(slot) => onChange({ ...settings, slot })}
          />
        </SettingsRow>
      </SettingsCard>
    </>
  );
}
