/** Breaks text into lines of at most width characters, on word boundaries */
export function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter((w) => w !== "")) {
    if (line !== "" && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  if (line !== "") lines.push(line);
  return lines.length > 0 ? lines : [""];
}

/** Two texts in two columns, the shorter one padded so the rows line up */
export function sideBySide(left: string, right: string, width = 52): string[] {
  const a = wrap(left, width);
  const b = wrap(right, width);
  const rows = Math.max(a.length, b.length);
  return Array.from({ length: rows }, (_, i) => `${(a[i] ?? "").padEnd(width)} | ${b[i] ?? ""}`);
}
