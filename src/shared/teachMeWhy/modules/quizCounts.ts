import quiz01 from "./quizzes/M01.json";
import quiz02 from "./quizzes/M02.json";
import quiz03 from "./quizzes/M03.json";
import quiz04 from "./quizzes/M04.json";
import quiz05 from "./quizzes/M05.json";
import quiz06 from "./quizzes/M06.json";
import quiz07 from "./quizzes/M07.json";
import quiz08 from "./quizzes/M08.json";
import quiz09 from "./quizzes/M09.json";
import quiz10 from "./quizzes/M10.json";
import quiz11 from "./quizzes/M11.json";
import quiz12 from "./quizzes/M12.json";

const QUIZZES: readonly { moduleId: string; questions: readonly unknown[] }[] = [
  quiz01,
  quiz02,
  quiz03,
  quiz04,
  quiz05,
  quiz06,
  quiz07,
  quiz08,
  quiz09,
  quiz10,
  quiz11,
  quiz12
];

/** How many questions a lesson's quiz holds, null for a lesson with no quiz */
export function quizQuestionCount(moduleId: string): number | null {
  const quiz = QUIZZES.find((candidate) => candidate.moduleId === moduleId);
  return quiz ? quiz.questions.length : null;
}
