import { useCallback, useRef, useState } from "react";

import { SUGGEST_CAPPED, suggestionNoneLine } from "../../../shared/handoff/alt/altCopy";
import { groupByImageHash } from "../../../shared/handoff/alt/altGroups";
import type { AltLayerView } from "../../../shared/handoff/alt/altRoots";
import { DEFAULT_ALT_STYLE, type AltStyle } from "../../../shared/handoff/alt/altStyles";
import {
  ALT_BATCH_CAP,
  INERT_SUGGEST,
  type SuggestApi,
  type SuggestionState
} from "./suggestTypes";
import { useResolveSuggestion } from "./useResolveSuggestion";

/**
 * Suggestions for the alt text, from the ones saved in the file first and from the local server only when the live path is on
 * A suggestion is shown and never written to a note, the designer's own action does that
 * A saved one and a live one come out the same, apart from not having waited
 */
export function useAltSuggest(available: boolean, live: boolean): SuggestApi {
  const [states, setStates] = useState<Record<string, SuggestionState>>({});
  const [run, setRun] = useState<SuggestApi["run"]>(null);
  const [note, setNote] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const { resolve } = useResolveSuggestion(available, live);

  const finish = useCallback(() => {
    abort.current = null;
    setRun(null);
  }, []);

  const runOver = useCallback(
    async (layers: readonly AltLayerView[]) => {
      if (!available || abort.current) return;
      const controller = new AbortController();
      abort.current = controller;
      setNote(null);
      const groups = groupByImageHash(layers);
      const chosen = groups.slice(0, ALT_BATCH_CAP);
      let done = 0;
      setRun({ done, total: chosen.length });
      for (const group of chosen) {
        if (controller.signal.aborted) break;
        const result = await resolve(
          group.layers[0] as AltLayerView,
          DEFAULT_ALT_STYLE,
          controller.signal
        );
        if (controller.signal.aborted) break;
        if (result === "stop") {
          setNote(suggestionNoneLine("unavailable"));
          break;
        }
        done += 1;
        setStates((previous) => ({
          ...previous,
          ...Object.fromEntries(group.layers.map((layer) => [layer.nodeId, result]))
        }));
        setRun({ done, total: chosen.length });
      }
      if (groups.length > chosen.length && !controller.signal.aborted)
        setNote(SUGGEST_CAPPED(done));
      finish();
    },
    [available, resolve, finish]
  );

  const suggest = useCallback(
    (layer: AltLayerView, style: AltStyle = DEFAULT_ALT_STYLE, fresh = false) => {
      if (!available) return;
      setStates((previous) => ({ ...previous, [layer.nodeId]: { status: "working", style } }));
      const controller = new AbortController();
      void resolve(layer, style, controller.signal, fresh).then((result) =>
        setStates((previous) => ({
          ...previous,
          [layer.nodeId]:
            result === "stop"
              ? { status: "none", style, line: suggestionNoneLine("unavailable") }
              : result
        }))
      );
    },
    [available, resolve]
  );

  const dismiss = useCallback(
    (nodeId: string) =>
      setStates((previous) =>
        Object.fromEntries(Object.entries(previous).filter(([id]) => id !== nodeId))
      ),
    []
  );
  const cancel = useCallback(() => abort.current?.abort(), []);
  const clear = useCallback(() => {
    abort.current?.abort();
    setStates({});
    setNote(null);
  }, []);

  if (!available) return INERT_SUGGEST;
  return {
    live,
    states,
    run,
    note,
    suggest,
    suggestAll: (layers) => void runOver(layers.filter((layer) => layer.status === "unanswered")),
    prepare: (layers) => void runOver(layers),
    cancel,
    dismiss,
    clear
  };
}
