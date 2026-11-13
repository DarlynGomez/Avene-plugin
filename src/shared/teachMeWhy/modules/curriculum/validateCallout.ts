const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const MAX_ROWS = 8;

function rowProblems(row: unknown, index: number): string[] {
  const at = `callout row ${index + 1}`;
  if (!isObject(row)) return [`${at} is not an object`];
  const problems: string[] = [];
  const sample = row.sample;
  if (!isObject(sample)) return [`${at} has no sample`];
  if (!(typeof sample.px === "number" && sample.px > 0))
    problems.push(`${at} has a size that is not a positive number`);
  if (!(typeof sample.weight === "number" && sample.weight >= 100 && sample.weight <= 900))
    problems.push(`${at} has a weight outside 100 to 900`);
  for (const key of ["size", "note", "needs"]) {
    if (typeof row[key] !== "string" || row[key] === "") problems.push(`${at} has no ${key}`);
  }
  return problems;
}

/** Every problem with a callout, its paragraph has to be one of the lesson's paragraphs */
export function validateCallout(callout: unknown, paragraphCount: number): string[] {
  if (!isObject(callout)) return ["the callout is not an object"];
  const problems: string[] = [];
  for (const key of ["label", "caption"]) {
    if (typeof callout[key] !== "string" || callout[key] === "")
      problems.push(`the callout has no ${key}`);
  }
  const index = callout.paragraphIndex;
  if (!(Number.isInteger(index) && (index as number) >= 0 && (index as number) < paragraphCount))
    problems.push("the callout paragraph is not one of the lesson paragraphs");
  const columns = callout.columns;
  if (!Array.isArray(columns) || columns.length !== 3 || columns.some((c) => typeof c !== "string"))
    problems.push("the callout needs three column names");
  const rows = callout.rows;
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_ROWS) {
    problems.push(`the callout needs 1 to ${MAX_ROWS} rows`);
  } else {
    rows.forEach((row, i) => problems.push(...rowProblems(row, i)));
  }
  return problems;
}
