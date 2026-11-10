import { suggestionNoneLine } from "../../../shared/handoff/alt/altCopy";
import type { AltStyle } from "../../../shared/handoff/alt/altStyles";
import type { SuggestionOutcome } from "../../../shared/handoff/alt/altSuggestion";
import type { SuggestionState } from "./suggestTypes";

/** What the sheet shows for an outcome, the same for a saved suggestion and a live one */
export function stateOf(
  outcome: SuggestionOutcome,
  fromCache: boolean,
  style: AltStyle
): SuggestionState {
  if (outcome.status === "describe") {
    return { status: "ready", style, text: outcome.text, warnings: outcome.warnings, fromCache };
  }
  if (outcome.status === "decorative") return { status: "decorative", style, fromCache };
  return { status: "none", style, line: suggestionNoneLine(outcome.reason) };
}
