import type { ExplanationEvent } from "../../../shared/study/explanationMessageTypes";

/** Tells the sandbox, which logs it only inside a study session */
export function sendExplanationEvent(event: ExplanationEvent): void {
  window.parent.postMessage({ pluginMessage: { type: "EXPLANATION_EVENT", event } }, "*");
}
