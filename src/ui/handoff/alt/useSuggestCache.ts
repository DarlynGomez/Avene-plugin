import { useCallback, useEffect, useRef } from "react";

import { isAltPluginMessage } from "../../../shared/handoff/alt/altMessages";
import { putSuggestion, type CachedSuggestion } from "../../../shared/handoff/alt/altSuggestCache";

const send = (message: unknown) => window.parent.postMessage({ pluginMessage: message }, "*");

/** The suggestions saved in the file, read once when the checks open and written whole whenever one is added */
export function useSuggestCache(available: boolean) {
  const cache = useRef<CachedSuggestion[]>([]);

  useEffect(() => {
    if (!available) return undefined;
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (isAltPluginMessage(message) && message.type === "HANDOFF_ALT_CACHE") {
        cache.current = message.entries;
      }
    }
    window.addEventListener("message", onMessage);
    send({ type: "HANDOFF_ALT_CACHE_REQUEST" });
    return () => window.removeEventListener("message", onMessage);
  }, [available]);

  const keep = useCallback((entry: CachedSuggestion) => {
    cache.current = putSuggestion(cache.current, entry);
    send({ type: "HANDOFF_ALT_CACHE_SET", entries: cache.current });
  }, []);

  return { cache, keep };
}
