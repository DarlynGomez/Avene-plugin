import type { AdjustMessage, AdjustReplyMessage } from "./adjustMessageTypes";
import type { CalibrationProfile } from "./calibrationSchema";
import type { CalibrationScope } from "./calibrationScope";
import type { RootDecision } from "./grouping/groupingTypes";
import type { IssueSummary } from "./issues/issueTypes";
import type { RootActionFailedMessage, RootMessage } from "./rootMessageTypes";
import type { SelectionMessage } from "./selectionMessageTypes";
import type {
  StudyExportReadyMessage,
  StudyMessage,
  StudyStateMessage
} from "./study/studyMessageTypes";

/** Asks the sandbox to save a finished calibration profile */
export interface CalibrationSaveMessage {
  type: "CALIBRATION_SAVE";
  profile: CalibrationProfile;
}

/** Asks the sandbox to load the saved profile */
export interface CalibrationLoadMessage {
  type: "CALIBRATION_LOAD";
}

/** The profile the sandbox picked */
export interface CalibrationLoadedMessage {
  type: "CALIBRATION_LOADED";
  profile: CalibrationProfile | null;
  resolvedScope: CalibrationScope | null;
}

/** The sandbox could not save the profile */
export interface CalibrationSaveFailedMessage {
  type: "CALIBRATION_SAVE_FAILED";
  message: string;
}

export interface CalibrationSavedMessage {
  type: "CALIBRATION_SAVED";
}

/** Asks for the issue list, answered with ISSUES_UPDATED */
export interface IssuesSubscribeMessage {
  type: "ISSUES_SUBSCRIBE";
}

/** Puts an issue off until the node is met again */
export interface IssueDeferMessage {
  type: "ISSUE_DEFER";
  issueId: string;
}

/** Records a final decision, the reason is required and checked again in the state machine */
export interface IssueIgnoreMessage {
  type: "ISSUE_IGNORE";
  issueId: string;
  reason: string;
}

/** Flags an issue as steady: always shown, never fades */
export interface IssueFlagImportantMessage {
  type: "ISSUE_FLAG_IMPORTANT";
  issueId: string;
}

/** Returns an issue to open, only ever an explicit designer action */
export interface IssueReopenMessage {
  type: "ISSUE_REOPEN";
  issueId: string;
}

/** Selects the node and scrolls to it, draws nothing */
export interface IssueFocusMessage {
  type: "ISSUE_FOCUS";
  issueId: string;
}

/** Every message the panel sends */
export type IssueMessage =
  | IssuesSubscribeMessage
  | IssueDeferMessage
  | IssueIgnoreMessage
  | IssueFlagImportantMessage
  | IssueReopenMessage
  | IssueFocusMessage;

/** The full issue list and decisions every time, never a delta */
export interface IssuesUpdatedMessage {
  type: "ISSUES_UPDATED";
  issues: readonly IssueSummary[];
  decisions: Readonly<Record<string, RootDecision>>;
}

/** An issue action was rejected, the message says why */
export interface IssueActionFailedMessage {
  type: "ISSUE_ACTION_FAILED";
  issueId: string;
  message: string;
}

/** Every message the panel receives */
export type IssuesPluginMessage =
  IssuesUpdatedMessage | IssueActionFailedMessage | RootActionFailedMessage;

/** UI to sandbox messages */
export type UiToPluginMessage =
  | CalibrationLoadMessage
  | CalibrationSaveMessage
  | IssueMessage
  | RootMessage
  | SelectionMessage
  | AdjustMessage
  | StudyMessage;

/** Sandbox to UI messages */
export type PluginToUiMessage =
  | CalibrationLoadedMessage
  | CalibrationSaveFailedMessage
  | CalibrationSavedMessage
  | IssuesUpdatedMessage
  | IssueActionFailedMessage
  | RootActionFailedMessage
  | AdjustReplyMessage
  | StudyStateMessage
  | StudyExportReadyMessage;

/** Every message that crosses the plugin boundary */
export type PluginMessage = UiToPluginMessage | PluginToUiMessage;
