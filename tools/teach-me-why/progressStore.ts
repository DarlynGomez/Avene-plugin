import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_DIR } from "./env";
import type { Progress } from "./types";

export interface ProgressStore {
  load: () => Progress | null;
  save: (progress: Progress) => void;
}

export const GENERATED_PATH = join(TOOL_DIR, "generated.json");

/** Written to a sibling file and renamed, so an interruption never leaves half a file */
export function writeAtomic(path: string, content: string): void {
  const temp = `${path}.tmp`;
  writeFileSync(temp, content);
  renameSync(temp, path);
}

export function fileStore(path: string = GENERATED_PATH): ProgressStore {
  return {
    load: () => (existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Progress) : null),
    save: (progress) => writeAtomic(path, JSON.stringify(progress, null, 2) + "\n")
  };
}
