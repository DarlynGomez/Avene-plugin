import { depthOk, explanationKeyOk, sourceOk } from "./explanationEventSchema";
import { participantIdError } from "./participantIdSchema";
import type { StudyEvent } from "./studyEvents";

const PHASES = ["designing", "reviewing", "ended"];
const STATES = ["open", "deferred", "ignored", "important", "resolved"];
const SEVERITIES = ["low", "medium", "high"];
const ACTIONS = [
  "defer",
  "pin",
  "unpin",
  "ignore",
  "reopen",
  "restore_deferred",
  "show_on_canvas",
  "locate"
];
const VIA = [...ACTIONS, "adjust", "selected_on_canvas"];

type Rec = Record<string, unknown>;
const isRec = (value: unknown): value is Rec =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): boolean => typeof value === "string";
const oneOf = (list: readonly string[], value: unknown): boolean =>
  typeof value === "string" && list.includes(value);

function contextOk(ctx: unknown): boolean {
  return (
    isRec(ctx) &&
    participantIdError(ctx.participantId) === null &&
    (ctx.block === 1 || ctx.block === 2) &&
    (ctx.task === "A" || ctx.task === "B") &&
    (ctx.condition === "live" || ctx.condition === "post-task") &&
    oneOf(PHASES, ctx.phase)
  );
}

function targetOk(target: unknown): boolean {
  return (
    isRec(target) &&
    ((target.kind === "issue" && str(target.issueId)) ||
      (target.kind === "root" && str(target.signature)))
  );
}

function rowsOk(rows: unknown): boolean {
  return (
    Array.isArray(rows) &&
    rows.every(
      (row) =>
        isRec(row) && str(row.id) && oneOf(STATES, row.state) && oneOf(SEVERITIES, row.severity)
    )
  );
}

const CHECKS: Record<StudyEvent["type"], (e: Rec) => boolean> = {
  block_started: (e) => typeof e.studyProfileVersion === "number",
  feedback_revealed: () => true,
  block_ended: (e) =>
    isRec(e.part) &&
    typeof e.part.index === "number" &&
    typeof e.part.of === "number" &&
    rowsOk(e.issues),
  issue_first_detected: (e) =>
    str(e.issueId) && oneOf(SEVERITIES, e.severity) && typeof e.startingIssue === "boolean",
  issue_first_response: (e) => str(e.issueId) && oneOf(VIA, e.via),
  issue_action: (e) =>
    oneOf(ACTIONS, e.action) &&
    targetOk(e.target) &&
    typeof e.instanceCount === "number" &&
    oneOf(STATES, e.resultingState) &&
    (e.fromDecisionOffer === undefined || typeof e.fromDecisionOffer === "boolean"),
  reason_written: (e) =>
    str(e.text) &&
    typeof e.truncated === "boolean" &&
    targetOk(e.target) &&
    oneOf(["ignore_sheet", "decision_offer"], e.source),
  adjust_event: (e) => typeof e.adjustLogIndex === "number" && str(e.issueId) && str(e.loggedAt),
  marker_state: (e) =>
    typeof e.markersOn === "boolean" &&
    oneOf(["shown", "hidden", "screen_changed"], e.change) &&
    typeof e.markerCount === "number" &&
    oneOf(["annotation", "dot", "ring"], e.style),
  explanation_opened: (e) =>
    oneOf(["why_surfaced", "teach_me_why"], e.surface) &&
    (e.issueId === undefined || str(e.issueId)) &&
    (e.surface !== "teach_me_why" || (explanationKeyOk(e.key) && sourceOk(e.source))),
  depth_changed: (e) => explanationKeyOk(e.key) && depthOk(e.toDepth),
  explanation_dismissed: (e) => explanationKeyOk(e.key),
  role_answered: (e) => str(e.nodeId) && str(e.role)
};

/** Why a stored value is not a usable event, or null when it is one */
export function studyEventProblem(value: unknown): string | null {
  if (!isRec(value)) return "the event is not an object";
  if (typeof value.type !== "string" || !(value.type in CHECKS))
    return "the event type is not known";
  if (!str(value.at)) return "the event has no time";
  if (!contextOk(value.ctx)) return "the event context is not valid";
  const check = CHECKS[value.type as StudyEvent["type"]];
  return check(value) ? null : `the ${value.type} fields are not valid`;
}

export function isStudyEvent(value: unknown): value is StudyEvent {
  return studyEventProblem(value) === null;
}
