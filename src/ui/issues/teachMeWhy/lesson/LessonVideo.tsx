import { Play } from "lucide-react";

import { clipTime, videoUrl } from "../../../../shared/teachMeWhy/lessonParts";
import type { ModuleVideoData } from "../../../../shared/teachMeWhy/modules/moduleTypes";
import cards from "./LessonCards.module.css";
import styles from "./Lesson.module.css";

/**
 * The clip as a card that opens the player in the browser, a player inside the plugin window cannot be relied on
 * The poster is drawn from type, so nothing is fetched until the card is pressed
 */
export function LessonVideo({ id, video }: { id: string; video: ModuleVideoData }) {
  const heading = `${id}-video`;
  const length = clipTime(video.durationSeconds);
  return (
    <section className={styles.block} aria-labelledby={heading}>
      <h2 id={heading} className={styles.label}>
        Prefer to watch?
      </h2>
      <a
        className={cards.videoCard}
        href={videoUrl(video)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={cards.poster} aria-hidden="true">
          <span className={cards.posterText}>Aa</span>
          <span className={cards.play}>
            <Play className={cards.icon} size={18} />
          </span>
          <span className={cards.chip}>{length}</span>
        </span>
        <span className={cards.cardBody}>
          <span className={cards.cardTitle}>{video.title}</span>
          <span className={cards.meta}>
            {video.publisher} · Video{video.captionsAvailable ? " · Captions" : ""}
          </span>
        </span>
        <span className={styles.visuallyHidden}>, {length} long, opens in your browser</span>
      </a>
    </section>
  );
}
