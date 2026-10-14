/** One recorded run, the header is written once and checked on every rerun */
export interface RunHeader {
  model: string;
  /** Whatever the service reported as a digest or version, null when it reports none */
  digest: string | null;
  promptVersion: string;
  /** Every version that wrote an item, set once a rerun used a newer prompt */
  promptVersions?: string[];
  /** Changes if the facts or frames a prompt would receive change */
  inputsHash: string;
  generatedAt: string;
}

export interface ItemResult {
  key: string;
  status: "completed" | "failed";
  text: string;
  factIds: string[];
  /** Why the final attempt was refused, empty when it passed */
  reasons: string[];
  /** The reasons each earlier or final attempt failed for */
  attemptReasons: string[][];
  attempts: number;
  /** Missing means the version the header first recorded */
  promptVersion?: string;
}

export interface Progress {
  header: RunHeader;
  items: Record<string, ItemResult>;
}

export interface Config {
  baseUrl: string;
  apiKey: string;
  model: string;
}
