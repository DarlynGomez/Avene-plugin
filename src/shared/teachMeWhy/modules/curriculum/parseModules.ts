import type { LearningModule } from "../moduleTypes";
import { parseArticle, parseVideo } from "./parseMedia";

/** Everything the document says about one module, before it is merged with what the repo already holds */
export type ParsedModule = Omit<LearningModule, "category"> & {
  forDevelopers: string;
};

export interface ParseResult {
  modules: ParsedModule[];
  problems: string[];
  /** The total the introduction states, in minutes */
  statedTotalMinutes: number | null;
}

const LABELS = [
  "Context:",
  "Why this matters:",
  "What you will learn:",
  "Time budget:",
  "Lesson text:",
  "Video:",
  "Optional article:",
  "Key takeaways:",
  "Review flags:",
  "Internal Note:",
  "For developers:"
] as const;

const BUDGET =
  /Reading: ([\d.]+) minutes?\. Video: ([\d.]+) minutes?\. Quiz: ([\d.]+) minutes?\. Total: ([\d.]+) minutes?/;

/** A line without its indent or its list star */
const clean = (line: string) => line.trim().replace(/^\*\s+/, "");
const labelOf = (line: string) => LABELS.find((label) => line.startsWith(label));

function blocksOf(lines: string[]): Map<string, { title: string; lines: string[] }> {
  const blocks = new Map<string, { title: string; lines: string[] }>();
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const start = /^Module (M\d{2}): (.+)$/.exec(line.trim());
    if (start) {
      current = { title: start[2].trim(), lines: [] };
      blocks.set(start[1], current);
    } else if (/^Delivery Options/.test(line.trim())) {
      current = null;
    } else if (current && line.trim() !== "") {
      current.lines.push(line);
    }
  }
  return blocks;
}

/** Fields by label, a label's text on its own line and the lines after it up to the next label */
function fieldsOf(lines: string[]): Map<string, string[]> {
  const fields = new Map<string, string[]>();
  let open: string[] | null = null;
  for (const line of lines) {
    const text = clean(line);
    const label = labelOf(text);
    if (label) {
      open = [];
      fields.set(label, open);
      const rest = text.slice(label.length).trim();
      if (rest !== "") open.push(rest);
    } else if (open) {
      open.push(text);
    }
  }
  return fields;
}

function expectCount(problems: string[], id: string, name: string, got: number, want: number) {
  if (got !== want) problems.push(`${id}: ${name} count is ${got}, expected ${want}`);
}

function one(fields: Map<string, string[]>, label: string): string {
  return (fields.get(label) ?? []).join(" ");
}

function parseOne(
  id: string,
  title: string,
  lines: string[],
  problems: string[]
): ParsedModule | null {
  const fields = fieldsOf(lines);
  const budget = BUDGET.exec(one(fields, "Time budget:"));
  const video = parseVideo(one(fields, "Video:"));
  const article = parseArticle(one(fields, "Optional article:"));
  for (const label of LABELS) {
    if (!fields.has(label) && label !== "Review flags:" && label !== "Internal Note:") {
      problems.push(`${id}: no ${label} line`);
    }
  }
  if (!budget) problems.push(`${id}: the Time budget line could not be read`);
  if (typeof video === "string") problems.push(`${id}: ${video}`);
  if (typeof article === "string") problems.push(`${id}: ${article}`);
  if (!budget || typeof video === "string" || typeof article === "string") return null;

  const objectives = fields.get("What you will learn:") ?? [];
  const paragraphs = fields.get("Lesson text:") ?? [];
  const takeaways = fields.get("Key takeaways:") ?? [];
  expectCount(problems, id, "learning objective", objectives.length, 3);
  expectCount(problems, id, "key takeaway", takeaways.length, 3);
  expectCount(problems, id, "lesson paragraph", paragraphs.length, id === "M11" ? 3 : 4);
  const flags = one(fields, "Review flags:");
  const note = one(fields, "Internal Note:");
  return {
    id,
    title,
    context: one(fields, "Context:"),
    estimatedMinutes: Number(budget[4]),
    timeBudgetMinutes: {
      reading: Number(budget[1]),
      video: Number(budget[2]),
      quiz: Number(budget[3])
    },
    whyItMatters: one(fields, "Why this matters:"),
    learningObjectives: objectives,
    lessonParagraphs: paragraphs,
    video,
    optionalArticle: article,
    keyTakeaways: takeaways,
    reviewFlags: flags === "" || /^None\.?$/i.test(flags) ? [] : [flags],
    ...(note === "" ? {} : { internalNote: note }),
    forDevelopers: one(fields, "For developers:")
  };
}

/** A byte order mark at the start of a saved file is not text */
const withoutBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/** Reads the curriculum text into modules, every count or line that is off becomes a problem and nothing is guessed */
export function parseCurriculum(text: string): ParseResult {
  const problems: string[] = [];
  const modules: ParsedModule[] = [];
  for (const [id, block] of blocksOf(withoutBom(text).split(/\r?\n/))) {
    const parsed = parseOne(id, block.title, block.lines, problems);
    if (parsed) modules.push(parsed);
  }
  const stated = /total estimated learning time of ([\d.]+) minutes/.exec(text);
  return { modules, problems, statedTotalMinutes: stated ? Number(stated[1]) : null };
}
