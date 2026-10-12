import type { Marker } from "./markerSet";

export type ShowResult =
  | { written: true }
  | {
      written: false;
      reason: "read_only" | "no_user";
      /** Plain words for the panel, set only the first time so it is said once */
      notice: string | null;
    };

export interface SweepResult {
  /** Annotated layers of this user's earlier sessions, and copies, that were cleaned */
  cleaned: number;
  /** Tagged layers left alone, another user's markers or ones with an unreadable tag */
  left: number;
}

/** All the rest of CADT knows about drawing markers, the Figma specifics stay behind it */
export interface MarkerRenderer {
  /** Makes exactly these markers exist for this screen, writing only the difference */
  show(screenId: string, markers: readonly Marker[]): Promise<ShowResult>;
  /** Removes every marker this session wrote */
  clear(): Promise<void>;
  /** The same for the close handler, which cannot wait */
  clearSync(): void;
  /** Cleans markers left by earlier sessions of this user and strips copies of tagged layers */
  sweepOrphans(): Promise<SweepResult>;
}
