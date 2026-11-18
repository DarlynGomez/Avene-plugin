import type { NoteSource } from "../handoff/noteStorage";
import type { StudyEventContext } from "./studyEvents";

interface Base {
  /** ISO time the event happened */
  at: string;
  ctx: StudyEventContext;
}

export interface RoleAnsweredEvent extends Base {
  type: "role_answered";
  nodeId: string;
  role: string;
  /** What produced the label that was shown: a rule, a reviewed precomputed suggestion, a live one, or none */
  source?: "rule" | "ai_precomputed" | "ai_live" | "none";
  /** The label that was shown to the participant, never the layer's words */
  suggested?: string | null;
  response?: "confirmed" | "changed" | "unsure";
  ruleId?: string;
  /** The model that made a suggestion, as the service reports it */
  model?: string;
}

/** An alt text answer was saved on one image layer, never the words themselves */
export interface AltAnsweredEvent extends Base {
  type: "alt_answered";
  nodeId: string;
  decorative: boolean;
  /** The participant's own words, a suggestion kept as it was, or a suggestion they changed */
  source: NoteSource;
  /** True when the answer took the note away, neither text nor decorative */
  cleared: boolean;
}

/** One picture was cropped to be sent for a live alt text suggestion */
export interface AltSuggestionRequestedEvent extends Base {
  type: "alt_suggestion_requested";
  nodeId: string;
}

export function buildAltAnswered(
  ctx: StudyEventContext,
  at: string,
  nodeId: string,
  answer: { text: string; decorative: boolean; source: NoteSource }
): AltAnsweredEvent {
  const cleared = !answer.decorative && answer.text.trim() === "";
  return {
    type: "alt_answered",
    at,
    ctx,
    nodeId,
    decorative: answer.decorative,
    source: answer.source,
    cleared
  };
}

export function buildAltSuggestionRequested(
  ctx: StudyEventContext,
  at: string,
  nodeId: string
): AltSuggestionRequestedEvent {
  return { type: "alt_suggestion_requested", at, ctx, nodeId };
}
