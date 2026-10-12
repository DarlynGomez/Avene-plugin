import type { MarkerStateChange } from "../study/studyEvents";
import type { Clock } from "./screenTracker";
import type { MarkerRenderer } from "./markerRenderer";
import type { MarkerStyle } from "./markerStyle";

/** Quiet time after an annotation changes before the canvas is read again and repaired */
export const ANNOTATION_RECONCILE_MS = 250;

export interface MarkerControllerDeps {
  renderer: MarkerRenderer;
  clock: Clock;
  schedule: (callback: () => void, ms: number) => unknown;
  cancel: (handle: unknown) => void;
  /** The feature is on and the study session, if any, shows feedback right now */
  isVisible: () => boolean;
  /** The screen under the viewport centre, read at launch and on a page change */
  launchScreenId: () => string | null;
  onNotice: (message: string) => void;
  /** The look to draw in right now, a study session has one fixed look */
  style: () => MarkerStyle;
  /** For the study log, told the look and never which screen */
  onStateChange: (change: MarkerStateChange, markerCount: number, style: MarkerStyle) => void;
}
