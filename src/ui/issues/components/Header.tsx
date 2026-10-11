import { BookOpen } from "lucide-react";

import type { Headline } from "../../../shared/grouping/headline";
import type { ParticipantVisibility } from "../../../shared/study/participantVisibility";
import { formatHeadline, openCountFromHeadline } from "../headlineText";
import styles from "./Header.module.css";

export type MainTab = "live-watch" | "teach-me-why";

export type HeaderVisibility = Pick<
  ParticipantVisibility,
  "liveWatchLabel" | "counts" | "headline" | "teachMeWhyTab"
>;

interface HeaderProps {
  visibility: HeaderVisibility;
  headline: Headline;
  activeMainTab: MainTab;
  onMainTabChange: (tab: MainTab) => void;
}

/**
 * Wordmark, live dot, tabs and the computed headline, no footer
 * The empty slot at the end is reserved for the markers toggle
 */
export function Header({ visibility, headline, activeMainTab, onMainTabChange }: HeaderProps) {
  const isLiveWatch = activeMainTab === "live-watch";

  if (!visibility.liveWatchLabel && !visibility.teachMeWhyTab) {
    return null;
  }

  return (
    <header className={styles.header}>
      {/* <div className={styles.topRow}>
        <span className={styles.wordmark}>CADT</span>
        <span className={styles.liveIndicator} aria-hidden="true" />
        <span className={styles.markerSlot} />
      </div> */}
      <div className={styles.tabRow} role="tablist">
        {visibility.liveWatchLabel && (
          <button
            type="button"
            role="tab"
            aria-selected={isLiveWatch}
            className={`${styles.tab} ${isLiveWatch ? styles.tabActive : ""}`}
            onClick={() => onMainTabChange("live-watch")}
          >
            Live Watch
            {visibility.counts && (
              <span className={`${styles.countPill} ${isLiveWatch ? styles.countPillActive : ""}`}>
                {openCountFromHeadline(headline)}
              </span>
            )}
          </button>
        )}
        {visibility.teachMeWhyTab && (
          <button
            type="button"
            role="tab"
            aria-selected={!isLiveWatch}
            className={`${styles.tab} ${!isLiveWatch ? styles.tabActive : ""}`}
            onClick={() => onMainTabChange("teach-me-why")}
          >
            <BookOpen size={14} aria-hidden="true" />
            <span>Teach Me Why</span>
          </button>
        )}
      </div>
      {isLiveWatch && visibility.headline && (
        <p className={styles.headline}>{formatHeadline(headline)}</p>
      )}
    </header>
  );
}
