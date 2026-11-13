import type { StatusKind, TableStatus } from "./tableTypes";

const WORDS: Record<StatusKind, string> = {
  open: "Open",
  needsCheck: "Needs check",
  adjusted: "Adjusted",
  ignored: "Ignored",
  decided: "Decided"
};

/** The word for a status, and whether it still needs someone to act */
export function statusFor(kind: StatusKind): TableStatus {
  return { kind, text: WORDS[kind], needsAction: kind === "open" || kind === "needsCheck" };
}
