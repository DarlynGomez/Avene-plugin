import type { AltStyle } from "../../../shared/handoff/alt/altStyles";
import type { AltRuleId } from "../../../shared/handoff/alt/altRuleTables";
import type { AltLayerView } from "../../../shared/handoff/alt/altRoots";

/** Images per run, about four calls fit in one token window at worst so this is a few minutes */
export const ALT_BATCH_CAP = 25;

export type SuggestionState =
  | { status: "working"; style: AltStyle }
  | {
      status: "ready";
      style: AltStyle;
      text: string;
      warnings: readonly AltRuleId[];
      fromCache: boolean;
    }
  | { status: "decorative"; style: AltStyle; fromCache: boolean }
  | { status: "none"; style: AltStyle; line: string };

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
  /** The setting it is asked with, and fresh to ask again and not use the one that was saved */
  suggest: (layer: AltLayerView, style?: AltStyle, fresh?: boolean) => void;
  suggestAll: (layers: readonly AltLayerView[]) => void;
  /** The same run over every picture, so the saved suggestions are ready before they are needed */
  prepare: (layers: readonly AltLayerView[]) => void;
  cancel: () => void;
  dismiss: (nodeId: string) => void;
  /** Forgets every suggestion held in the panel, for the development reset */
  clear: () => void;
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
  dismiss: nothing,
  clear: nothing
};
