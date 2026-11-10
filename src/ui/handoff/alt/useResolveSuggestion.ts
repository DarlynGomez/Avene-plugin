import { useCallback, useRef } from "react";

import { suggestionNoneLine } from "../../../shared/handoff/alt/altCopy";
import type { AltLayerView } from "../../../shared/handoff/alt/altRoots";
import type { AltStyle } from "../../../shared/handoff/alt/altStyles";
import { pickSuggestion } from "../../../shared/handoff/alt/altSuggestCache";
import { outcomeOf, outcomeOfReply } from "../../../shared/handoff/alt/altSuggestion";
import { askAltServer } from "./altServerClient";
import { stateOf } from "./suggestState";
import type { SuggestionState } from "./suggestTypes";
import { useAltCrop } from "./useAltCrop";
import { useSuggestCache } from "./useSuggestCache";

/** One picture: a saved suggestion if there is one, else the server, and "stop" when the server cannot be reached */
export function useResolveSuggestion(available: boolean, live: boolean) {
  const { cache, keep } = useSuggestCache(available);
  const model = useRef<string | null>(null);
  const requestCrop = useAltCrop(available && live);

  const resolve = useCallback(
    async (
      layer: AltLayerView,
      style: AltStyle,
      signal: AbortSignal,
      fresh = false
    ): Promise<SuggestionState | "stop"> => {
      // The most recent one for this setting is the one used, asking again is the only way to replace it
      const saved = fresh
        ? null
        : pickSuggestion(cache.current, layer.imageHash, model.current, style);
      if (saved) return stateOf(outcomeOf(saved.kind, saved.text, layer.name), true, style);
      if (!live) return { status: "none", style, line: suggestionNoneLine("live-off") };
      const crop = await requestCrop(layer.nodeId);
      if (!crop.ok) return { status: "none", style, line: suggestionNoneLine("no-picture") };
      const asked = await askAltServer(
        {
          requestId: `${layer.nodeId}-${Date.now().toString(36)}`,
          image: crop.image,
          width: crop.width,
          height: crop.height,
          style
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
          style,
          kind: outcome.status,
          text: outcome.status === "describe" ? outcome.text : "",
          at: new Date().toISOString()
        });
      }
      return stateOf(outcome, false, style);
    },
    [live, requestCrop, keep]
  );

  return { resolve };
}
