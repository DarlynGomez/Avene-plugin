import { ExternalLink } from "lucide-react";

import type { OptionalArticleData } from "../../../../shared/teachMeWhy/modules/moduleTypes";
import { STUDY_BUILD } from "../../../../shared/studyBuild";
import cards from "./LessonCards.module.css";
import styles from "./Lesson.module.css";

/** The article to read next: a link card, or in the study build only its name as plain text */
export function LessonResources({ id, article }: { id: string; article: OptionalArticleData }) {
  if (STUDY_BUILD) {
    return (
      <p className={styles.source}>
        Source: {article.title}, {article.author}
      </p>
    );
  }
  const heading = `${id}-read`;
  const minutes = article.minutesToRead === null ? "" : ` · ${article.minutesToRead} min`;
  return (
    <section className={styles.block} aria-labelledby={heading}>
      <h2 id={heading} className={styles.label}>
        Read more
      </h2>
      <a className={cards.articleCard} href={article.url} target="_blank" rel="noopener noreferrer">
        <span className={cards.cardBody}>
          <span className={cards.cardTitle}>{article.title}</span>
          <span className={cards.meta}>
            {article.author} · Article{minutes}
          </span>
        </span>
        <ExternalLink className={cards.icon} size={16} aria-hidden="true" />
        <span className={styles.visuallyHidden}>, opens in your browser</span>
      </a>
    </section>
  );
}
