import { hintsFor } from "../../shared/debug/detectionHints";
import { formatReport } from "../../shared/debug/detectionReport";
import { collectCheckData } from "./detectionCheckData";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A small window holding the report as selectable text with a Copy button, nothing else */
function reportWindow(report: string): string {
  return `<!doctype html><meta charset="utf-8">
<style>body{margin:8px;font:12px sans-serif}textarea{width:100%;height:calc(100vh - 56px);font:11px monospace;box-sizing:border-box}</style>
<button id="copy">Copy report</button> <span id="done"></span>
<textarea id="report" readonly>${escape(report)}</textarea>
<script>
const box = document.getElementById("report");
document.getElementById("copy").onclick = async () => {
  box.select();
  let ok = false;
  try { await navigator.clipboard.writeText(box.value); ok = true; } catch (e) { try { ok = document.execCommand("copy"); } catch (f) { ok = false; } }
  document.getElementById("done").textContent = ok ? "Copied" : "Press Cmd or Ctrl and C to copy";
};
</script>`;
}

/** Debug menu command: runs detection without saving anything and shows what it found and why */
export async function runDetectionCheck(): Promise<void> {
  figma.showUI(reportWindow("Checking, this takes a moment..."), { width: 560, height: 640 });
  const data = await collectCheckData();
  const report = formatReport(data, hintsFor(data), new Date().toISOString());
  console.log(`[CADT debug]\n${report}`);
  figma.showUI(reportWindow(report), { width: 560, height: 640 });
}
