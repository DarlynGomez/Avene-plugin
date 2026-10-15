import type { RoleInputs } from "../roleInputs";
import { inputsFor, taskALayers } from "./taskLayers";

const rows = taskALayers();

export function layer(id: string): RoleInputs {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) throw new Error(`There is no layer ${id} in the task file`);
  return inputsFor(row, rows);
}

/** A layer with the names a designer who never renamed anything would have, its shape unchanged */
export const UNNAMED = {
  layerName: "Text",
  autoRename: true,
  parentName: "Frame 12",
  ancestorNames: ["Frame 12", "Frame 3", "Screen"],
  componentName: null
} as const;

/** A screen whose main text is this size, with enough text for the rules to compare with */
export function bodyCensus(px: number) {
  return [
    { fontSizePx: px, charCount: 100 },
    { fontSizePx: px * 2, charCount: 5 },
    { fontSizePx: px * 0.8, charCount: 5 },
    { fontSizePx: px, charCount: 5 }
  ];
}

export const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");
