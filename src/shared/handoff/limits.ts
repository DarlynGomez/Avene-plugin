/** Figma caps one plugin data entry at 100 kB counting the plugin id and key, this leaves room for both */
export const ENTRY_VALUE_MAX_BYTES = 60000;

/** Chosen with the size tests: five notes of this length at the widest characters stay far under the cap */
export const NOTE_TEXT_MAX_CHARS = 1000;

export const META_LONG_MAX_CHARS = 1000;
export const META_SHORT_MAX_CHARS = 100;

/** Bytes of the UTF-8 form, counted by hand since the sandbox may have no text encoder */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/** Cuts by whole characters, a pair of code units for one character is never split */
export function cutChars(text: string, max: number): string {
  return text.length <= max ? text : Array.from(text).slice(0, max).join("");
}

export function fits(text: string): boolean {
  return utf8Length(text) <= ENTRY_VALUE_MAX_BYTES;
}
