import { useEffect, useRef } from "react";

import type { QuizScreenQuestion } from "../../../../shared/teachMeWhy/modules/quizCounts";
import styles from "./Quiz.module.css";

interface QuizResultsProps {
  questions: readonly QuizScreenQuestion[];
  results: readonly boolean[];
  onRestart: () => void;
  onBack: () => void;
}

/** The score, each question with the answer that was right, and the two ways on */
export function QuizResults({ questions, results, onRestart, onBack }: QuizResultsProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const score = results.filter(Boolean).length;

  return (
    <section className={styles.card} aria-labelledby="quiz-results">
      <h2 ref={heading} id="quiz-results" tabIndex={-1} className={styles.prompt}>
        You answered {score} of {questions.length} correctly.
      </h2>
      <ol className={styles.review}>
        {questions.map((question, index) => {
          const answer = question.options.find((option) => option.id === question.correctOptionId);
          return (
            <li key={question.questionId} className={styles.reviewItem}>
              <p className={results[index] ? styles.verdictRight : styles.verdictWrong}>
                {results[index] ? "Correct" : "Not quite"}
              </p>
              <p className={styles.reviewPrompt}>{question.prompt}</p>
              <p className={styles.explanation}>Answer: {answer?.text}</p>
            </li>
          );
        })}
      </ol>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onRestart}>
          Try again
        </button>
        <button type="button" className={styles.secondary} onClick={onBack}>
          Back to lesson
        </button>
      </div>
    </section>
  );
}
