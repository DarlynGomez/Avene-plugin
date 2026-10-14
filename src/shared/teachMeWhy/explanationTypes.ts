import type { Severity } from "../issues/issueTypes";

export const ELEMENT_ROLES = [
  "heading",
  "body",
  "caption",
  "label",
  "button text",
  "decorative",
  "unknown"
] as const;
export type ElementRole = (typeof ELEMENT_ROLES)[number];

export type SizeClass = "normal" | "large";
export type Depth = 1 | 2 | 3;

/** Everything an explanation is looked up by */
export interface ExplanationKey {
  role: ElementRole;
  severity: Severity;
  size: SizeClass;
  depth: Depth;
}

/** Inclusive word counts for each depth */
export const DEPTH_WORD_LIMITS: Record<Depth, { min: number; max: number }> = {
  1: { min: 25, max: 45 },
  2: { min: 60, max: 90 },
  3: { min: 100, max: 150 }
};

export type ReadStatus = "full" | "excerpt" | "summary";

export interface Fact {
  id: string;
  /** The sentence a participant can read */
  plain: string;
  /** Technical detail for reviewers, never shown */
  reviewerNote: string;
  source: string;
  dateRead: string;
  readStatus: ReadStatus;
  /** An excerpt only counts once the whole source was read and this is recorded */
  excerptVerified: boolean;
}

/** An approved entry came from review, a fallback is a template a person wrote */
export interface ExplanationEntry {
  text: string;
  status: "approved" | "fallback";
  reviewer: string | null;
  factIds: readonly string[];
}

/** Recorded once in the table, where its explanations came from */
export interface GenerationRecord {
  model: string;
  digest: string | null;
  promptVersion: string;
  /** Set when items came from more than one prompt version */
  promptVersions?: string[];
  generatedAt: string;
}

export interface ExplanationTable {
  /** Set when the entries were imported from a reviewed generation run */
  generation?: GenerationRecord;
  /** One fixed template for every depth */
  fallbacks: Record<`${Depth}`, ExplanationEntry>;
  /** Approved entries by key string */
  entries: Record<string, ExplanationEntry>;
}
