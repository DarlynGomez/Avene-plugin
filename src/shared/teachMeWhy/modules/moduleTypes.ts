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
  minutesToRead: number;
}

export interface LearningModule {
  id: string;
  title: string;
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
  /** A lesson with no video says so with null and shows text only */
  video: ModuleVideoData | null;
  optionalArticle: OptionalArticleData | null;
  keyTakeaways: string[];
  reviewFlags: string[];
  internalNote?: string;
  /** For people building from the lesson, stored and never shown to a participant */
  forDevelopers?: string;
}
