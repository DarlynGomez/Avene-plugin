export interface ModuleVideoData {
  provider: "youtube";
  videoId: string;
  title: string;
  publisher: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  captionsAvailable: boolean;
  transcriptAvailable: boolean | null;
  embeddingAllowed: boolean;
  license: string;
}

export interface OptionalArticleData {
  title: string;
  author?: string;
  published?: string;
  url: string;
  /** Null when nobody measured it, a reading time is never guessed */
  minutesToRead: number | null;
}

/** One row of a callout table, the sample is drawn at this size and weight */
export interface CalloutRow {
  sample: { px: number; weight: number };
  size: string;
  note: string;
  needs: string;
}

/** A card that holds one lesson paragraph and a small table under it */
export interface LessonCallout {
  label: string;
  /** Zero based, that paragraph is shown in the card instead of in the body */
  paragraphIndex: number;
  caption: string;
  columns: string[];
  rows: CalloutRow[];
}

export interface LearningModule {
  id: string;
  title: string;
  /** One plain line under the title */
  subtitle?: string;
  category: "visual" | "motor" | "cognitive" | "system";
  context: string;
  estimatedMinutes: number;
  timeBudgetMinutes: {
    reading: number;
    video: number;
    quiz: number;
  };
  whyItMatters: string;
  learningObjectives: string[];
  lessonParagraphs: string[];
  callout?: LessonCallout;
  /** A lesson with no video says so with null and shows text only */
  video: ModuleVideoData | null;
  optionalArticle: OptionalArticleData | null;
  keyTakeaways: string[];
  reviewFlags: string[];
  internalNote?: string;
  /** For people building from the lesson, stored and never shown to a participant */
  forDevelopers?: string;
}
