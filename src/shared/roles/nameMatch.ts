/** Lower case words, split at punctuation and at a lower to upper case change, padded to match whole words */
export function normalizeName(name: string): string {
  const spaced = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase();
  return ` ${spaced} `;
}

/** The pattern that matches the name as a whole word or phrase, or null */
export function matchedPattern(name: string, patterns: readonly string[]): string | null {
  const words = normalizeName(name);
  return patterns.find((pattern) => words.includes(normalizeName(pattern))) ?? null;
}
