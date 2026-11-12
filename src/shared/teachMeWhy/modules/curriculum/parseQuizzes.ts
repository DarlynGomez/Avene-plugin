export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  moduleId: string;
  questionId: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  hint: string;
  testedLearningPoint: string;
}

export interface QuizFile {
  moduleId: string;
  questions: QuizQuestion[];
}

const MARKER = "Appendix: Quizzes (JSON)";

const FIELDS = ["prompt", "explanation", "hint", "testedLearningPoint"] as const;

function questionProblem(question: unknown): string | null {
  const q = question as QuizQuestion | null;
  if (!q || typeof q !== "object") return "a question is not an object";
  const name = typeof q.questionId === "string" ? q.questionId : "a question with no id";
  if (!/^M\d{2}_Q\d$/.test(q.questionId ?? "")) return `${name}: the id is not in the M01_Q1 form`;
  if (!/^M\d{2}$/.test(q.moduleId ?? "") || !q.questionId.startsWith(`${q.moduleId}_`)) {
    return `${name}: the module id does not match`;
  }
  for (const field of FIELDS) if (typeof q[field] !== "string") return `${name}: no ${field}`;
  if (!Array.isArray(q.options) || q.options.length < 2) return `${name}: needs options`;
  const ids = q.options.map((option) => option?.id);
  if (new Set(ids).size !== ids.length) return `${name}: option ids are not unique`;
  if (!q.options.every((option) => typeof option?.text === "string"))
    return `${name}: option without text`;
  if (!ids.includes(q.correctOptionId))
    return `${name}: the correct option is not among the options`;
  return null;
}

/** The list ends at the first line that closes it and still reads as JSON, a works cited list follows it */
function readArray(text: string): unknown {
  for (let end = text.indexOf("\n]"); end >= 0; end = text.indexOf("\n]", end + 1)) {
    try {
      return JSON.parse(text.slice(0, end + 2)) as unknown;
    } catch {
      // not the end yet
    }
  }
  return null;
}

/** The appendix as one file per module, in the shape the repo holds, with every problem listed and nothing guessed */
export function parseQuizzes(text: string): { files: QuizFile[]; problems: string[] } {
  const problems: string[] = [];
  const at = text.indexOf(MARKER);
  const start = at < 0 ? -1 : text.indexOf("[", at);
  if (start < 0) return { files: [], problems: ["the quiz appendix was not found"] };
  const parsed = readArray(text.slice(start));
  if (parsed === null) return { files: [], problems: ["the quiz appendix is not valid JSON"] };
  if (!Array.isArray(parsed)) return { files: [], problems: ["the quiz appendix is not a list"] };
  for (const question of parsed) {
    const problem = questionProblem(question);
    if (problem) problems.push(problem);
  }
  if (problems.length > 0) return { files: [], problems };
  const byModule = new Map<string, QuizQuestion[]>();
  for (const question of parsed as QuizQuestion[]) {
    byModule.set(question.moduleId, [...(byModule.get(question.moduleId) ?? []), question]);
  }
  const files = [...byModule].map(([moduleId, questions]) => ({ moduleId, questions }));
  for (const file of files) {
    if (file.questions.length !== 3) {
      problems.push(`${file.moduleId}: ${file.questions.length} questions, expected 3`);
    }
  }
  const all = (parsed as QuizQuestion[]).map((question) => question.questionId);
  if (new Set(all).size !== all.length) problems.push("a question id is used twice");
  return { files, problems };
}
