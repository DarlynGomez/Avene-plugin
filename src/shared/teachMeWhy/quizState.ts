/** Where a reader is in a quiz, kept in memory only, nothing is stored or logged */
export interface QuizState {
  index: number;
  /** The option picked for the current question, null until one is picked */
  chosen: string | null;
  /** True once the current answer has been checked, then the choice is locked */
  checked: boolean;
  showHint: boolean;
  /** Whether each checked question was answered correctly, in order */
  results: boolean[];
  done: boolean;
}

export type QuizAction =
  | { type: "choose"; optionId: string }
  | { type: "hint" }
  | { type: "check"; correctOptionId: string }
  | { type: "next"; total: number }
  | { type: "restart" };

export const QUIZ_START: QuizState = {
  index: 0,
  chosen: null,
  checked: false,
  showHint: false,
  results: [],
  done: false
};

/** One step of the quiz, an action that does not fit the current moment changes nothing */
export function quizStep(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "choose":
      return state.checked || state.done ? state : { ...state, chosen: action.optionId };
    case "hint":
      return state.checked ? state : { ...state, showHint: true };
    case "check":
      if (state.checked || state.chosen === null) return state;
      return {
        ...state,
        checked: true,
        results: [...state.results, state.chosen === action.correctOptionId]
      };
    case "next":
      if (!state.checked) return state;
      if (state.index + 1 >= action.total) return { ...state, done: true };
      return { ...QUIZ_START, index: state.index + 1, results: state.results };
    case "restart":
      return QUIZ_START;
  }
}

export const quizScore = (state: QuizState): number => state.results.filter(Boolean).length;
