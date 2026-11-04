export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/** Cut, never rounded up, so a ratio just under the line cannot print as the line */
export function formatRatio(ratio: number): string {
  return String(Math.floor(ratio * 100 + 1e-6) / 100);
}
