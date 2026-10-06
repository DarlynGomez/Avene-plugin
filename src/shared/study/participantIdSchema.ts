import type { BlockNumber, StudyCondition, TaskId } from "./studyTypes";

const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export type StartFormField =
  "participantId" | "block" | "task" | "condition" | "paperConsentSigned";

/** What the researcher enters to start a block, before it has been checked */
export interface StartFormInput {
  participantId?: unknown;
  block?: unknown;
  task?: unknown;
  condition?: unknown;
  paperConsentSigned?: unknown;
}

export interface ValidStartForm {
  participantId: string;
  block: BlockNumber;
  task: TaskId;
  condition: StudyCondition;
}

export type StartFormResult =
  | { ok: true; value: ValidStartForm }
  | { ok: false; errors: Readonly<Partial<Record<StartFormField, string>>> };

/** Returns the researcher facing problem, or null when the id is usable in a file name */
export function participantIdError(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return "Enter a participant ID";
  }
  if (value.length > 32) {
    return "Use 32 characters or fewer";
  }
  if (!PARTICIPANT_ID_PATTERN.test(value)) {
    return "Use only letters, digits, hyphen and underscore, with no spaces";
  }
  return null;
}

/** The whole start form, every field checked so the panel can show all problems at once */
export function validateStartForm(input: StartFormInput): StartFormResult {
  const errors: Partial<Record<StartFormField, string>> = {};

  const idProblem = participantIdError(input.participantId);
  if (idProblem) errors.participantId = idProblem;
  if (input.block !== 1 && input.block !== 2) errors.block = "Choose block 1 or 2";
  if (input.task !== "A" && input.task !== "B") errors.task = "Choose task A or B";
  if (input.condition !== "live" && input.condition !== "post-task") {
    errors.condition = "Choose live or post-task";
  }
  if (input.paperConsentSigned !== true) {
    errors.paperConsentSigned = "Confirm that paper consent was signed";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      participantId: input.participantId as string,
      block: input.block as BlockNumber,
      task: input.task as TaskId,
      condition: input.condition as StudyCondition
    }
  };
}
