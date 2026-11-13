/** The only colors the exported page uses, passed in so none is written here */
export interface HtmlTheme {
  ink: string;
  muted: string;
  background: string;
  card: string;
  line: string;
}

/** Inline styles for the exported page, which has no other stylesheet and loads nothing */
export function htmlStyle(t: HtmlTheme): string {
  return `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: ${t.background}; color: ${t.ink}; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 52rem; margin: 0 auto; padding: 2rem 1rem 3rem; }
h1 { margin: 0 0 0.25rem; font-size: 1.5rem; line-height: 1.25; overflow-wrap: anywhere; }
h2 { margin: 2rem 0 0.5rem; font-size: 1.125rem; break-after: avoid; }
p { margin: 0; overflow-wrap: anywhere; }
.muted, .count, caption, thead th, .note, .where, .needs, a { color: ${t.ink}; text-decoration: underline; }
footer { color: ${t.muted}; }
.count { font-weight: 400; }
.lead { margin-top: 0.25rem; }
table { width: 100%; border-collapse: collapse; background: ${t.card}; border: 1px solid ${t.line}; }
caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
thead th { padding: 0.5rem 0.75rem; background: ${t.background}; border-bottom: 1px solid ${t.line}; font-size: 0.875rem; font-weight: 400; text-align: left; }
th.right, td.right { text-align: right; }
tbody + tbody > tr:first-child > * { border-top: 1px solid ${t.line}; }
tbody th, tbody td { padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
tbody tr:first-child > * { padding-bottom: 0; }
tbody th { font-weight: 600; }
.where, .needs, .note { display: block; font-size: 0.875rem; font-weight: 400; }
.fit { width: 1%; white-space: nowrap; }
.measured { display: block; font-weight: 600; font-variant-numeric: tabular-nums; }
.strong { color: ${t.ink}; font-weight: 600; }
.quiet { color: ${t.muted}; }
.detail { padding-top: 0; }
.line, .quiet.line { display: block; }
.note { margin-top: 0.25rem; }
footer { margin-top: 2rem; padding-top: 0.75rem; border-top: 1px solid ${t.line}; font-size: 0.875rem; }
footer p + p { margin-top: 0.25rem; }
@media print {
  body { background: ${t.card}; }
  main { max-width: none; padding: 0; }
  table, tbody, tr { break-inside: avoid; }
  thead { display: table-header-group; }
}`;
}
