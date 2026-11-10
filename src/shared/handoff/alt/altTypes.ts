/** One visible layer that has an image fill, as the inventory found it */
export interface ImageLayer {
  nodeId: string;
  name: string;
  screenId: string;
  screenName: string;
  width: number;
  height: number;
  /** The same picture used again has the same hash, which is how copies are grouped */
  imageHash: string;
}

/** Not recorded yet is a state of the notes and not a finding, so there is no failed one */
export type AltStatus = "answered" | "decorative" | "unanswered";

export interface AltLayer extends ImageLayer {
  status: AltStatus;
}

export interface ImageGroup {
  imageHash: string;
  layers: readonly ImageLayer[];
}

export interface AltCounts {
  unanswered: number;
  answered: number;
  decorative: number;
}

export interface ScreenAltCounts extends AltCounts {
  screenId: string;
  screenName: string;
}

export interface AltSummary extends AltCounts {
  perScreen: readonly ScreenAltCounts[];
}
