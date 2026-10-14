import type { Depth, ExplanationKey } from "../teachMeWhy/explanationTypes";
import type { StudyEventContext } from "./studyEvents";

interface Base {
  /** ISO time the event happened */
  at: string;
  ctx: StudyEventContext;
}

export interface ExplanationOpenedEvent extends Base {
  type: "explanation_opened";
  surface: "why_surfaced" | "teach_me_why";
  issueId?: string;
  /** The key of the Teach Me Why explanation, never its words or the layer */
  key?: ExplanationKey;
  /** The tab bar or the link on a root card */
  source?: "tab" | "card";
}

export interface DepthChangedEvent extends Base {
  type: "depth_changed";
  /** The key before the change, the depth after is the next field */
  key: ExplanationKey;
  toDepth: Depth;
}

export interface ExplanationDismissedEvent extends Base {
  type: "explanation_dismissed";
  key: ExplanationKey;
}
