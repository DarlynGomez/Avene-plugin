import type { AltRuleId } from "../../../shared/handoff/alt/altRuleTables";
import type { AltLayerView } from "../../../shared/handoff/alt/altRoots";

/** Per run, so a long file cannot spend the whole window on suggestions, a placeholder to tune from a measured run */
export const ALT_BATCH_CAP = 25;

export type SuggestionState =
  | { status: "working" }
  | { status: "ready"; text: string; warnings: readonly AltRuleId[]; fromCache: boolean }
  | { status: "decorative"; fromCache: boolean }
  | { status: "none"; line: string };

export interface SuggestRun {
  done: number;
  total: number;
}

export interface SuggestApi {
  /** False while the live path is off, saved suggestions are then the only ones there are */
  live: boolean;
  states: Readonly<Record<string, SuggestionState>>;
  run: SuggestRun | null;
  /** One plain line about the last run, such as the service not being reachable */
  note: string | null;
  suggest: (layer: AltLayerView) => void;
  suggestAll: (layers: readonly AltLayerView[]) => void;
  /** The same run over every picture, so the saved suggestions are ready before they are needed */
  prepare: (layers: readonly AltLayerView[]) => void;
  cancel: () => void;
  dismiss: (nodeId: string) => void;
}

const nothing = () => undefined;

export const INERT_SUGGEST: SuggestApi = {
  live: false,
  states: {},
  run: null,
  note: null,
  suggest: nothing,
  suggestAll: nothing,
  prepare: nothing,
  cancel: nothing,
  dismiss: nothing
};
