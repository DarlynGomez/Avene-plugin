import { useCallback, useRef, useState } from "react";

import { SUGGEST_CAPPED, suggestionNoneLine } from "../../../shared/handoff/alt/altCopy";
import { groupByImageHash } from "../../../shared/handoff/alt/altGroups";
import type { AltLayerView } from "../../../shared/handoff/alt/altRoots";
import { pickSuggestion } from "../../../shared/handoff/alt/altSuggestCache";
import { outcomeOf, outcomeOfReply } from "../../../shared/handoff/alt/altSuggestion";
import { askAltServer } from "./altServerClient";
import { stateOf } from "./suggestState";
import {
  ALT_BATCH_CAP,
  INERT_SUGGEST,
  type SuggestApi,
  type SuggestionState
} from "./suggestTypes";
import { useAltCrop } from "./useAltCrop";
import { useSuggestCache } from "./useSuggestCache";

/**
 * Suggestions for the alt text, from the ones saved in the file first and from the local server only when the live path is on
 * A suggestion is shown and never written to a note, the designer's own action does that
 * A saved one and a live one come out the same, apart from not having waited
 */
export function useAltSuggest(available: boolean, live: boolean): SuggestApi {
  const [states, setStates] = useState<Record<string, SuggestionState>>({});
  const [run, setRun] = useState<SuggestApi["run"]>(null);
  const [note, setNote] = useState<string | null>(null);
  const model = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const requestCrop = useAltCrop(available && live);

  const { cache, keep } = useSuggestCache(available);

  /** One picture: a saved suggestion if there is one, else the server; "stop" when the server cannot be reached */
  const resolve = useCallback(
    async (layer: AltLayerView, signal: AbortSignal): Promise<SuggestionState | "stop"> => {
      const saved = pickSuggestion(cache.current, layer.imageHash, model.current);
      if (saved) return stateOf(outcomeOf(saved.kind, saved.text, layer.name), true);
      if (!live) return { status: "none", line: suggestionNoneLine("live-off") };
      const crop = await requestCrop(layer.nodeId);
      if (!crop.ok) return { status: "none", line: suggestionNoneLine("no-picture") };
      const asked = await askAltServer(
        {
          requestId: `${layer.nodeId}-${Date.now().toString(36)}`,
          image: crop.image,
          width: crop.width,
          height: crop.height
        },
        signal
      );
      if (asked.kind === "transport") return "stop";
      const outcome = outcomeOfReply(asked.reply, layer.name);
      model.current = asked.reply.model ?? model.current;
      if (outcome.status === "describe" || outcome.status === "decorative") {
        keep({
          imageHash: layer.imageHash,
          modelId: asked.reply.model ?? "unknown",
          kind: outcome.status,
          text: outcome.status === "describe" ? outcome.text : "",
          at: new Date().toISOString()
        });
      }
      return stateOf(outcome, false);
    },
    [live, requestCrop, keep]
  );

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
        const result = await resolve(group.layers[0] as AltLayerView, controller.signal);
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
    (layer: AltLayerView) => {
      if (!available) return;
      setStates((previous) => ({ ...previous, [layer.nodeId]: { status: "working" } }));
      const controller = new AbortController();
      void resolve(layer, controller.signal).then((result) =>
        setStates((previous) => ({
          ...previous,
          [layer.nodeId]:
            result === "stop" ? { status: "none", line: suggestionNoneLine("unavailable") } : result
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
    dismiss
  };
}
