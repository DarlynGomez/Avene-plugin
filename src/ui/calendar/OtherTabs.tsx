import { Check } from "lucide-react";
import { useState } from "react";

import { DevelopmentCard } from "./DevelopmentCard";
import levels from "./Levels.module.css";
import styles from "./Settings.module.css";
import { SettingsCard, SettingsRow } from "./SettingsRow";

/** The contrast bar and scope of the live check, shown as they are since neither can change yet */
export function StandardsTab() {
  return (
    <>
      <SettingsCard title="Contrast target" sub="The ratios the live check measures against">
        <div className={levels.levels}>
          <div className={`${levels.level} ${levels.levelOn}`}>
            <span className={levels.levelName}>
              WCAG AA
              <Check size={16} aria-label="In use" />
            </span>
            <span className={levels.levelRatios}>4.5:1 Body · 3.0:1 Large</span>
          </div>
          <div className={`${levels.level} ${levels.levelOff}`} aria-disabled="true">
            <span className={levels.levelName}>WCAG AAA</span>
            <span className={levels.levelRatios}>Not available yet</span>
          </div>
        </div>
      </SettingsCard>
    </>
  );
}

/** What can be cleared, nothing here touches the design file */
export function PreferencesTab({ onReset }: { onReset: () => void }) {
  const [cleared, setCleared] = useState(false);
  return (
    <>
      <SettingsCard
        title="Deferral counts"
        sub="How often each color pair in this file was deferred"
      >
        <SettingsRow label="Reset deferral counts" hint="Your calendar choices stay as they are">
          <button
            type="button"
            className={styles.small}
            onClick={() => {
              onReset();
              setCleared(true);
            }}
          >
            Reset
          </button>
        </SettingsRow>
        <p className={styles.hint} role="status">
          {cleared ? "Counts cleared." : ""}
        </p>
      </SettingsCard>
      <DevelopmentCard />
    </>
  );
}
