import { Check, X } from "lucide-react";
import { useEffect, useRef, type Dispatch } from "react";

import type { QuizScreenQuestion } from "../../../../shared/teachMeWhy/modules/quizCounts";
import type { QuizAction, QuizState } from "../../../../shared/teachMeWhy/quizState";
import styles from "./Quiz.module.css";

interface QuizQuestionCardProps {
  question: QuizScreenQuestion;
  state: QuizState;
  dispatch: Dispatch<QuizAction>;
  total: number;
  /** False for the first question, whose page heading already has focus */
  focusOnShow: boolean;
}

/** One question: the choices, a hint on request, then the answer with why, and one button that moves on */
export function QuizQuestionCard({
  question,
  state,
  dispatch,
  total,
  focusOnShow
}: QuizQuestionCardProps) {
  const prompt = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnShow) prompt.current?.focus();
  }, [focusOnShow, question.questionId]);
  const promptId = `${question.questionId}-prompt`;
  const right = state.chosen === question.correctOptionId;
  const last = state.index + 1 >= total;

  return (
    <fieldset className={styles.card} aria-labelledby={promptId}>
      <h2 ref={prompt} id={promptId} tabIndex={-1} className={styles.prompt}>
        {question.prompt}
      </h2>
      <div className={styles.options}>
        {question.options.map((option) => {
          const isRight = state.checked && option.id === question.correctOptionId;
          const isWrongPick = state.checked && option.id === state.chosen && !right;
          const mark = isRight ? styles.right : isWrongPick ? styles.wrong : "";
          return (
            <label key={option.id} className={`${styles.option} ${mark}`.trim()}>
              <input
                type="radio"
                name={question.questionId}
                value={option.id}
                checked={state.chosen === option.id}
                disabled={state.checked}
                onChange={() => dispatch({ type: "choose", optionId: option.id })}
              />
              <span className={styles.optionText}>{option.text}</span>
              {isRight && <Check className={styles.markIcon} size={16} aria-hidden="true" />}
              {isWrongPick && <X className={styles.markIcon} size={16} aria-hidden="true" />}
              {isRight && <span className={styles.tag}>Correct answer</span>}
              {isWrongPick && <span className={styles.tag}>Your answer</span>}
            </label>
          );
        })}
      </div>
      {!state.checked &&
        (state.showHint ? (
          <p className={styles.hint}>Hint: {question.hint}</p>
        ) : (
          <button
            type="button"
            className={styles.textButton}
            onClick={() => dispatch({ type: "hint" })}
          >
            Show a hint
          </button>
        ))}
      <div role="status" className={styles.feedback}>
        {state.checked && (
          <>
            <p className={right ? styles.verdictRight : styles.verdictWrong}>
              {right ? "Correct." : "Not quite."}
            </p>
            <p className={styles.explanation}>{question.explanation}</p>
          </>
        )}
      </div>
      <button
        type="button"
        className={styles.primary}
        disabled={!state.checked && state.chosen === null}
        onClick={() =>
          state.checked
            ? dispatch({ type: "next", total })
            : dispatch({ type: "check", correctOptionId: question.correctOptionId })
        }
      >
        {!state.checked ? "Check answer" : last ? "See results" : "Next question"}
      </button>
    </fieldset>
  );
}
