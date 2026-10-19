import type { RolePluginMessage } from "../../../shared/roles/roleMessages";
import { parseReviewCsv, reviewCsv, type ReviewRow } from "../../../shared/roles/reviewCsv";
import {
  NOT_READABLE,
  decideReviewRow,
  type ReviewResult
} from "../../../shared/roles/reviewDecision";
import { inputKeyOf } from "../../../shared/roles/roleStorage";
import { resolveScreen } from "../../detection/adapter/resolveScreen";
import { readRoleData, removeSuggestion, writeSuggestion } from "./roleData";
import { inputsFor, textNodeById } from "./roleState";

/** The menu commands of the researcher review, the panel asks for its mode once it has subscribed */
export const EXPORT_ROLE_SUGGESTIONS_COMMAND = "export-role-suggestions";
export const IMPORT_ROLE_REVIEW_COMMAND = "import-role-review";

type Post = (message: RolePluginMessage) => void;

let pending: "export" | "import" | null = null;

export function requestReview(command: string): void {
  if (command === EXPORT_ROLE_SUGGESTIONS_COMMAND) pending = "export";
  if (command === IMPORT_ROLE_REVIEW_COMMAND) pending = "import";
}

export function resetReview(): void {
  pending = null;
}

/** Every visible text layer that holds a suggestion, the final label starts as the model's */
async function exportRows(): Promise<ReviewRow[]> {
  await figma.loadAllPagesAsync();
  const nodes = figma.root.findAll((n) => n.type === "TEXT" && n.visible) as TextNode[];
  const rows: ReviewRow[] = [];
  for (const node of nodes) {
    const found = readRoleData(node)?.suggestion;
    if (!found) continue;
    rows.push({
      screen: resolveScreen(node).screenName,
      layerName: node.name,
      nodeId: node.id,
      modelLabel: found.label,
      model: found.model ?? "",
      reviewed: found.reviewed ? "yes" : "no",
      inputKey: found.inputKey,
      finalLabel: found.label,
      note: ""
    });
  }
  return rows;
}

/** The panel is ready, tell it which review the command asked for */
export async function subscribeReview(post: Post): Promise<void> {
  const mode = pending;
  if (!mode) return;
  pending = null;
  if (mode === "import") {
    post({ type: "ROLE_REVIEW_MODE", mode });
    return;
  }
  const rows = await exportRows();
  post({ type: "ROLE_REVIEW_MODE", mode, count: rows.length, csv: reviewCsv(rows) });
}

/** Applies each reviewed row to its layer, a row that no longer fits the layer is skipped and counted */
export async function importReview(csv: string, post: Post): Promise<void> {
  const rows = parseReviewCsv(csv);
  const result: ReviewResult = rows ? { ...NOT_READABLE, unreadable: false } : NOT_READABLE;
  for (const row of rows ?? []) {
    const node = await textNodeById(row.nodeId);
    const current = { found: !!node, inputKey: node ? inputKeyOf(await inputsFor(node)) : "" };
    const decision = decideReviewRow(row, current);
    if (decision.kind === "skip") result[decision.reason] += 1;
    else if (node && decision.kind === "remove") {
      removeSuggestion(node);
      result.removed += 1;
    } else if (node && decision.kind === "write") {
      writeSuggestion(node, {
        label: decision.label,
        source: "ai",
        model: readRoleData(node)?.suggestion?.model ?? (row.model || null),
        reviewed: true,
        live: false,
        inputKey: current.inputKey,
        at: new Date().toISOString()
      });
      result.imported += 1;
    }
  }
  post({ type: "ROLE_REVIEW_RESULT", result });
}
