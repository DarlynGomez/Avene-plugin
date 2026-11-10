import type { NodeNote } from "../noteStorage";
import type {
  AltCounts,
  AltLayer,
  AltStatus,
  AltSummary,
  ImageLayer,
  ScreenAltCounts
} from "./altTypes";

/** The alt note of a layer decides it, a layer with none is simply not recorded yet */
export function altStatusOf(notes: readonly NodeNote[] | undefined): AltStatus {
  const alt = notes?.find((note) => note.category === "alt");
  if (!alt) return "unanswered";
  if (alt.decorative) return "decorative";
  return alt.text.trim() === "" ? "unanswered" : "answered";
}

export function withStatus(
  layers: readonly ImageLayer[],
  notesByNode: Readonly<Record<string, readonly NodeNote[]>>
): AltLayer[] {
  return layers.map((layer) => ({ ...layer, status: altStatusOf(notesByNode[layer.nodeId]) }));
}

const none = (): AltCounts => ({ unanswered: 0, answered: 0, decorative: 0 });

/** Counts overall and per screen, the screens in the order they were first seen */
export function summarizeAlt(layers: readonly AltLayer[]): AltSummary {
  const total = none();
  const screens = new Map<string, ScreenAltCounts>();
  for (const layer of layers) {
    let screen = screens.get(layer.screenId);
    if (!screen) {
      screen = { screenId: layer.screenId, screenName: layer.screenName, ...none() };
      screens.set(layer.screenId, screen);
    }
    total[layer.status] += 1;
    screen[layer.status] += 1;
  }
  return { ...total, perScreen: [...screens.values()] };
}
