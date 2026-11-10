import { vi } from "vitest";

export function emit(message: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: message } }));
}

/** Answers what the panel asks of the plugin: a crop of any layer, and the saved suggestions as they are kept */
export function pluginResponder(initial: unknown[] = []) {
  let entries = initial;
  const later = (message: unknown) => setTimeout(() => emit(message), 0);
  return {
    get entries() {
      return entries;
    },
    handle(message: { type: string; [key: string]: unknown }) {
      if (message.type === "HANDOFF_ALT_CROP_REQUEST") {
        later({
          type: "HANDOFF_ALT_CROP",
          nodeId: message.nodeId,
          ok: true,
          image: "iVBORw==",
          width: 120,
          height: 80
        });
      } else if (message.type === "HANDOFF_ALT_CACHE_REQUEST") {
        later({ type: "HANDOFF_ALT_CACHE", entries });
      } else if (message.type === "HANDOFF_ALT_CACHE_SET") {
        entries = message.entries as unknown[];
        later({ type: "HANDOFF_ALT_CACHE", entries, saved: true });
      }
    }
  };
}

/** The local server, as a stand in for fetch, answering what it is told and counting how many calls are open at once */
export function stubServer(answer: (call: number) => unknown | Promise<unknown>) {
  const state = { calls: 0, open: 0, mostOpen: 0 };
  const fetchStub = vi.fn(async (_url: string, init?: RequestInit) => {
    state.calls += 1;
    state.open += 1;
    state.mostOpen = Math.max(state.mostOpen, state.open);
    try {
      const body = await answer(state.calls);
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return new Response(JSON.stringify(body), { status: 200 });
    } finally {
      state.open -= 1;
    }
  });
  vi.stubGlobal("fetch", fetchStub);
  return { state, fetchStub };
}

export const described = (text: string, model = "vision:v1") => ({
  kind: "describe",
  text,
  reason: "ok",
  model,
  ms: 900
});
