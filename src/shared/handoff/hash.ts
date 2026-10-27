/** Link slots are left out so pasting a file address does not change a hash */
const LINK_SLOT = /^k\d+$/;

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function tableText(table: Readonly<Record<string, string>>): string {
  return Object.entries(table)
    .filter(([id]) => !LINK_SLOT.test(id))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, value]) => `${id}=${value}`)
    .join("\n");
}

/** Over the sorted slot table: the values in a document, an identity check and not security */
export function findingsHash(table: Readonly<Record<string, string>>): string {
  return fnv1a(tableText(table));
}

/**
 * Over the lines in slot form as well as the values, so words that are not slots count too:
 * sign-off status, severity words, which items are left out, section order, and later notes
 * The key for a cached draft, since a draft is written from this exact structure
 */
export function structureHash(
  sections: readonly { id: string; lines: readonly string[] }[],
  table: Readonly<Record<string, string>>
): string {
  const lines = sections.map((section) => `${section.id}\n${section.lines.join("\n")}`);
  return fnv1a(`${lines.join("\n\n")}\n--\n${tableText(table)}`);
}
