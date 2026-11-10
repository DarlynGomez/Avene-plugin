import { groupByImageHash } from "./altGroups";
import { altStatusOf } from "./altStatus";
import type { AltLayer, ImageLayer } from "./altTypes";
import type { NodeNote, NoteSource } from "../noteStorage";
import { noteSource } from "../noteStorage";

/** A layer with what its note says, for the panel to show and edit */
export interface AltLayerView extends AltLayer {
  text: string;
  source: NoteSource;
}

export interface AltScreen {
  id: string;
  name: string;
}

/** One picture, however many layers use it */
export interface AltRoot {
  imageHash: string;
  /** The name of the first layer, which is what the card is called */
  name: string;
  layers: readonly AltLayerView[];
  screens: readonly AltScreen[];
  unanswered: number;
}

export type AltGroupBy = "root-cause" | "screen";

export interface AltSection {
  key: string;
  /** Empty for the grouping by picture, which has no sections */
  label: string;
  roots: readonly AltRoot[];
}

export interface AltCounts {
  /** Pictures with at least one layer that has no note or mark yet */
  roots: number;
  /** Layers with no note or mark yet */
  layers: number;
  /** Screens those layers are on */
  screens: number;
  screenIds: readonly string[];
  answered: number;
  decorative: number;
}

export function altLayerViews(
  layers: readonly ImageLayer[],
  notesByNode: Readonly<Record<string, readonly NodeNote[]>>
): AltLayerView[] {
  return layers.map((layer) => {
    const notes = notesByNode[layer.nodeId];
    const alt = notes?.find((note) => note.category === "alt");
    return {
      ...layer,
      status: altStatusOf(notes),
      text: alt?.text ?? "",
      source: alt ? noteSource(alt) : "designer"
    };
  });
}

function rootOf(imageHash: string, layers: readonly AltLayerView[]): AltRoot {
  const screens = new Map<string, AltScreen>();
  for (const layer of layers) {
    screens.set(layer.screenId, { id: layer.screenId, name: layer.screenName });
  }
  return {
    imageHash,
    name: layers[0]?.name ?? "Image",
    layers,
    screens: [...screens.values()],
    unanswered: layers.filter((layer) => layer.status === "unanswered").length
  };
}

/** Pictures that still need a note come first, the rest keep the order they were found in */
function needsFirst(roots: readonly AltRoot[]): AltRoot[] {
  return [...roots].sort((a, b) => Number(b.unanswered > 0) - Number(a.unanswered > 0));
}

export function buildAltRoots(views: readonly AltLayerView[]): AltRoot[] {
  return needsFirst(
    groupByImageHash(views).map((group) => rootOf(group.imageHash, group.layers as AltLayerView[]))
  );
}

/** By picture there is one list, by screen each screen has the pictures that appear on it */
export function sectionAltRoots(views: readonly AltLayerView[], groupBy: AltGroupBy): AltSection[] {
  if (groupBy === "root-cause") return [{ key: "all", label: "", roots: buildAltRoots(views) }];
  const screens = new Map<string, { name: string; layers: AltLayerView[] }>();
  for (const view of views) {
    const entry = screens.get(view.screenId) ?? { name: view.screenName, layers: [] };
    entry.layers.push(view);
    screens.set(view.screenId, entry);
  }
  return [...screens].map(([key, entry]) => ({
    key,
    label: entry.name,
    roots: buildAltRoots(entry.layers)
  }));
}

export function altCounts(views: readonly AltLayerView[]): AltCounts {
  const open = views.filter((view) => view.status === "unanswered");
  const screenIds = [...new Set(open.map((view) => view.screenId))];
  return {
    roots: new Set(open.map((view) => view.imageHash)).size,
    layers: open.length,
    screens: screenIds.length,
    screenIds,
    answered: views.filter((view) => view.status === "answered").length,
    decorative: views.filter((view) => view.status === "decorative").length
  };
}

/** The layer a card acts on: the first one with nothing recorded, else the first */
export function targetLayer(root: AltRoot): AltLayerView {
  return root.layers.find((layer) => layer.status === "unanswered") ?? root.layers[0];
}

/** The text a layer's note should carry after an edit, an unedited suggestion stays a suggestion */
export function sourceAfterEdit(
  previous: NoteSource,
  previousText: string,
  text: string
): NoteSource {
  if (previous === "designer") return "designer";
  return text.trim() === previousText.trim() ? previous : "ai_edited";
}
