export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7";

export interface Violation {
  rule: RuleId;
  detail: string;
  match?: string;
}

/** The block being checked: its template in slot form and the slot table of the document */
export interface VerifyContext {
  templateLines: readonly string[];
  slots: Readonly<Record<string, string>>;
}

export interface VerifyResult {
  ok: boolean;
  /** Stop the text: every violation of raw model output, the hard rules for an edit */
  blocking: Violation[];
  /** Shown beside an edit and listed at the review gate */
  warnings: Violation[];
}
