export interface SlotBuilder {
  /** Fixed id, for values every document has once */
  put: (id: string, value: string | number) => string;
  /** Numbered id by prefix, the same prefix and value give the same id */
  auto: (prefix: string, value: string | number) => string;
  table: () => Record<string, string>;
}

/** Every value that can appear in text lives here, the text holds ids only */
export function createSlots(): SlotBuilder {
  const values = new Map<string, string>();
  const counters = new Map<string, number>();
  const seen = new Map<string, string>();
  return {
    put(id, value) {
      values.set(id, String(value));
      return `{${id}}`;
    },
    auto(prefix, value) {
      const text = String(value);
      const key = `${prefix}\u0000${text}`;
      const known = seen.get(key);
      if (known) return known;
      const next = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, next);
      const id = `${prefix}${next}`;
      values.set(id, text);
      seen.set(key, `{${id}}`);
      return `{${id}}`;
    },
    table: () => Object.fromEntries(values)
  };
}

export function fillSlots(text: string, table: Readonly<Record<string, string>>): string {
  return text.replace(/\{([A-Za-z0-9_]+)\}/g, (match, id: string) => table[id] ?? match);
}
