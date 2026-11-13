import { useEffect, useReducer, useRef, useState } from "react";

import type { LearningModule } from "../../../../shared/teachMeWhy/modules/moduleTypes";
import { quizQuestions } from "../../../../shared/teachMeWhy/modules/quizCounts";
import { QUIZ_START, quizStep } from "../../../../shared/teachMeWhy/quizState";
import lesson from "../lesson/Lesson.module.css";
import { QuizQuestionCard } from "./QuizQuestionCard";
import { QuizResults } from "./QuizResults";

interface LessonQuizProps {
  module: LearningModule;
  onBackToLesson: () => void;
}

/**
 * The lesson's quiz, one question at a time, then the score
 * Answers live in memory only: nothing is saved, sent or logged, and leaving the quiz forgets them
 */
export function LessonQuiz({ module, onBackToLesson }: LessonQuizProps) {
  const questions = quizQuestions(module.id);
  const [state, dispatch] = useReducer(quizStep, QUIZ_START);
  // Counts the restarts, so a fresh first question takes focus from the Try again button that is gone
  const [round, setRound] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const question = questions[state.index];

  return (
    <article className={lesson.lesson} aria-labelledby={`${module.id}-quiz`}>
      <header className={lesson.header}>
        <p className={lesson.eyebrow}>
          {state.done
            ? "Quiz · Results"
            : `Quiz · Question ${state.index + 1} of ${questions.length}`}
        </p>
        <h1 ref={heading} tabIndex={-1} id={`${module.id}-quiz`} className={lesson.title}>
          {module.title}
        </h1>
        <p className={lesson.subtitle}>Check your understanding</p>
      </header>
      {state.done || !question ? (
        <QuizResults
          questions={questions}
          results={state.results}
          onRestart={() => {
            setRound((count) => count + 1);
            dispatch({ type: "restart" });
          }}
          onBack={onBackToLesson}
        />
      ) : (
        <QuizQuestionCard
          key={`${round}-${question.questionId}`}
          question={question}
          state={state}
          dispatch={dispatch}
          total={questions.length}
          focusOnShow={state.index > 0 || round > 0}
        />
      )}
    </article>
  );
}
