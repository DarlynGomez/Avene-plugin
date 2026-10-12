import type { Marker } from "./markerSet";
import type { MarkerStyle } from "./markerStyle";

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
  /** Makes exactly these markers exist for this screen in this style, writing only the difference */
  show(
    screenId: string,
    markers: readonly Marker[],
    style?: MarkerStyle,
    /** False for a change that is only a resize, so it adds nothing to the undo history */
    undoStep?: boolean
  ): Promise<ShowResult>;
  /** Removes every marker this session wrote */
  clear(): Promise<void>;
  /** The same for the close handler, which cannot wait */
  clearSync(): void;
  /** The layers this session has put a marker or a tag on, for noticing changes made to them */
  liveNodeIds(): ReadonlySet<string>;
  /** Cleans markers left by earlier sessions of this user and strips copies of tagged layers */
  sweepOrphans(): Promise<SweepResult>;
}
