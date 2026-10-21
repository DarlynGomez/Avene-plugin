import type { CheckData, TextRow } from "../../shared/debug/detectionReport";
import { loadRawIssues } from "../accountability/issueStore";
import { BUILD_INFO } from "../buildInfo";
import { rowFor } from "./detectionCheckRows";
import { readRawStudySession } from "../study/adapter/studySessionStore";

const MAX_ROWS = 15;
const MAX_CHECKED = 400;
const WRITE_KEY = "cadt.debug.check";
const REPORTED_STATES = ["open", "deferred", "ignored", "important", "resolved"];

const text = (error: unknown) =>
  error instanceof Error && error.message ? error.message : String(error);

function safeWriteTest(errors: string[]): string {
  try {
    const value = String(Date.now());
    figma.root.setPluginData(WRITE_KEY, value);
    const back = figma.root.getPluginData(WRITE_KEY);
    figma.root.setPluginData(WRITE_KEY, "");
    return back === value
      ? "ok, wrote and read back a value"
      : "FAILED, the value read back was different";
  } catch (error) {
    errors.push(`saving: ${text(error)}`);
    return `FAILED, ${text(error)}`;
  }
}

function storedSummary(errors: string[]): CheckData["stored"] {
  const stored: CheckData["stored"] = { issueCount: null, byState: {}, study: "none" };
  try {
    const records = Object.values(loadRawIssues());
    stored.issueCount = records.length;
    for (const state of REPORTED_STATES)
      stored.byState[state] = records.filter((r) => r.state === state).length;
  } catch (error) {
    errors.push(`reading issue records: ${text(error)}`);
  }
  try {
    const raw = readRawStudySession();
    const session = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    stored.study = session
      ? `present, condition ${session.condition}, phase ${session.phase}, exited ${session.exitedAt !== null}`
      : "none";
  } catch (error) {
    errors.push(`reading the study session: ${text(error)}`);
  }
  return stored;
}

/** Collects everything the report needs, a step that fails is recorded and the rest carry on */
export async function collectCheckData(): Promise<CheckData> {
  const errors: string[] = [];
  const page = figma.currentPage;
  let loadAllPages = "ok";
  try {
    await figma.loadAllPagesAsync();
  } catch (error) {
    loadAllPages = text(error);
    errors.push(`loading pages: ${loadAllPages}`);
  }
  let nodes: TextNode[] = [];
  try {
    nodes = page.findAllWithCriteria({ types: ["TEXT"] });
  } catch (error) {
    errors.push(`finding text: ${text(error)}`);
  }
  const selected = new Set(page.selection.map((n) => n.id));
  const ordered = [
    ...nodes.filter((n) => selected.has(n.id)),
    ...nodes.filter((n) => !selected.has(n.id))
  ];
  const rows: TextRow[] = [];
  for (const node of ordered.slice(0, MAX_CHECKED)) {
    try {
      rows.push(await rowFor(node));
    } catch (error) {
      errors.push(`checking "${node.name}": ${text(error)}`);
    }
  }
  return {
    build: BUILD_INFO,
    figma: {
      apiVersion: figma.apiVersion,
      editorType: figma.editorType,
      command: figma.command,
      pluginId: figma.pluginId ?? "none",
      page: page.name,
      pageCount: figma.root.children.length
    },
    apis: {
      loadAllPagesAsync: typeof figma.loadAllPagesAsync === "function",
      getNodeByIdAsync: typeof figma.getNodeByIdAsync === "function",
      findAllWithCriteria: typeof page.findAllWithCriteria === "function"
    },
    loadAllPages,
    writeTest: safeWriteTest(errors),
    stored: storedSummary(errors),
    selection: page.selection.slice(0, 5).map((n) => `${n.type} "${n.name}" ${n.id}`),
    text: {
      total: nodes.length,
      visible: nodes.filter((n) => n.visible).length,
      checked: rows.length,
      flagged: rows.filter((row) => row.verdict === "flagged").length,
      rows: rows.slice(0, MAX_ROWS)
    },
    errors
  };
}
