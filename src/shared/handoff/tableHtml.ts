import { htmlStyle, type HtmlTheme } from "./tableHtmlStyle";
import { countsLine } from "./tableText";
import type { HandoffTableModel, TableGroup, TableNote, TableRow } from "./tableTypes";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Every string that came from the file or the designer goes through this before it is put in the page */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** avene-handoff-2026-11-13.html, from the day the handoff was made */
export function handoffHtmlFileName(generatedAt: string): string {
  return `avene-handoff-${generatedAt.slice(0, 10)}.html`;
}

const e = escapeHtml;

function status(row: TableRow): string {
  const tone = row.status.needsAction ? "strong" : "quiet";
  return `<td class="fit right ${tone}">${e(row.status.text)}</td>`;
}

function note(item: TableNote): string {
  return `<span class="${item.tone === "quiet" ? "note" : "line"}">${e(item.text)}</span>`;
}

function itemRows(row: TableRow, contrast: boolean): string {
  const facts = [row.location, ...row.details].filter((part) => part !== "");
  const open = row.link
    ? `<a href="${e(row.link)}" aria-label="Open in Figma: ${e(row.element)}">Open in Figma</a>`
    : "";
  const needs = row.contrast?.required
    ? `<span class="needs">needs ${e(row.contrast.required)}</span>`
    : "";
  const where = [facts.length > 0 ? e(facts.join(" · ")) : "", open].filter((part) => part !== "");
  const cells = [
    `<th scope="row">${e(row.element)}${where.length > 0 ? `<span class="where">${where.join(" · ")}</span>` : ""}</th>`,
    ...(contrast
      ? [
          `<td class="fit"><span class="measured">${e(row.contrast?.measured ?? "")}</span>${needs}</td>`
        ]
      : []),
    status(row)
  ];
  const detail =
    row.detail || row.notes.length > 0
      ? `<tr><td class="detail" colspan="${contrast ? 3 : 2}">${
          row.detail
            ? `<span class="${row.detail.muted ? "quiet line" : "line"}">${e(row.detail.text)}</span>`
            : ""
        }${row.notes.map(note).join("")}</td></tr>`
      : "";
  return `<tbody><tr>${cells.join("")}</tr>${detail}</tbody>`;
}

function group(g: TableGroup): string {
  const contrast = g.id === "contrast";
  const id = `group-${g.id}`;
  return `<section aria-labelledby="${id}">
<h2 id="${id}">${e(g.title)} <span class="count">${g.rows.length}</span></h2>
<table>
<caption>${e(g.title)}, ${g.rows.length} ${g.rows.length === 1 ? "row" : "rows"}</caption>
<thead><tr><th scope="col">${contrast ? "Element" : "Image"}</th>${
    contrast ? '<th scope="col" class="fit">Contrast</th>' : ""
  }<th scope="col" class="fit right">Status</th></tr></thead>
${g.rows.map((row) => itemRows(row, contrast)).join("\n")}
</table>
</section>`;
}

/**
 * One self-contained page from the same model as the screen: inline styles, no script, no image, no request
 * The colors come from the caller so the page uses the plugin's own palette
 */
export function buildTableHtml(model: HandoffTableModel, theme: HtmlTheme): string {
  const { header } = model;
  const title = header.title.trim() === "" ? "Untitled file" : header.title;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}: accessibility handoff</title>
<style>${htmlStyle(theme)}</style>
</head>
<body>
<main>
<header>
<h1>${e(title)}</h1>
<p class="muted">${e(header.subtitle)}</p>
<p class="muted lead"><strong class="strong">${header.counts.needAction} need action</strong>${e(countsLine(header.counts).slice(`${header.counts.needAction} need action`.length))}</p>
<p class="muted">${e(header.review)}</p>
</header>
${model.empty ? `<p class="lead">${e(model.empty)}</p>` : ""}
${model.groups.map(group).join("\n")}
${header.buildId ? `<footer>\n<p>Build ${e(header.buildId)}</p>\n</footer>` : ""}
</main>
</body>
</html>
`;
}
