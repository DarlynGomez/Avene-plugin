/** Defers every open instance in the root */
export interface RootDeferMessage {
  type: "ROOT_DEFER";
  issueIds: string[];
  /** Names the root for the study log, the sandbox never computes it */
  signature?: string;
}

/** Marks every instance important */
export interface RootMarkImportantMessage {
  type: "ROOT_MARK_IMPORTANT";
  issueIds: string[];
  signature?: string;
}

/** Returns only the important instances to open */
export interface RootUnmarkImportantMessage {
  type: "ROOT_UNMARK_IMPORTANT";
  issueIds: string[];
  signature?: string;
}

/** One reason applied to every instance and saved as a decision for the signature */
export interface RootIgnoreMessage {
  type: "ROOT_IGNORE";
  issueIds: string[];
  reason: string;
  signature: string;
  fromDecisionOffer: boolean;
}

/** Reopens ignored instances, clearDecision drops the saved decision when none stay ignored */
export interface RootReopenMessage {
  type: "ROOT_REOPEN";
  issueIds: string[];
  signature: string;
  clearDecision: boolean;
}

/** Returns only deferred instances to open */
export interface RootRestoreDeferredMessage {
  type: "ROOT_RESTORE_DEFERRED";
  issueIds: string[];
  signature?: string;
}

/** Every group action the panel sends */
export type RootMessage =
  | RootDeferMessage
  | RootMarkImportantMessage
  | RootUnmarkImportantMessage
  | RootIgnoreMessage
  | RootReopenMessage
  | RootRestoreDeferredMessage;

/** A group action was rejected, the message says why */
export interface RootActionFailedMessage {
  type: "ROOT_ACTION_FAILED";
  issueIds: readonly string[];
  message: string;
}
