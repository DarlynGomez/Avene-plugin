import type { CheckData } from "./detectionReport";

/** Plain advice from what the check found, the first thing to read in the report */
export function hintsFor(data: CheckData): string[] {
  const hints: string[] = [];
  const missing = Object.entries(data.apis)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (missing.length > 0) {
    hints.push(
      `This version of Figma lacks ${missing.join(", ")}, so detection cannot start. Update Figma.`
    );
  }
  if (data.loadAllPages !== "ok")
    hints.push(`Loading the pages failed (${data.loadAllPages}), so detection would not start.`);
  if (!data.writeTest.startsWith("ok")) {
    hints.push(
      "The plugin cannot save to this file, so found issues never reach the panel. Check you can edit the file, and that it is not view only."
    );
  }
  if (data.text.total === 0) {
    hints.push(
      "There is no text layer on the current page. Open the page that holds the text, or add some."
    );
  }
  const passing = data.text.rows.filter((row) => row.verdict === "passes");
  if (data.text.total > 0 && data.text.flagged === 0 && passing.length > 0) {
    hints.push(
      "The text passes the contrast rule as it is. Large text (24 px, or 18.66 px bold) needs only 3.0, and other text 4.5. Try light grey #B6ADA5 on white #FFFFFF at 14 px, which fails at any size."
    );
  }
  if (data.text.rows.some((row) => row.verdict === "not evaluated")) {
    hints.push(
      "Some text could not be measured, see the reasons under it. A gradient, image or hidden layer behind the text does this."
    );
  }
  if (data.text.flagged > 0 && data.stored.issueCount === 0) {
    hints.push(
      "Issues exist now but none are saved. Close CADT and open it again from Plugins, Development, CADT, and check you are running the build named above."
    );
  }
  if (data.text.changedByShapes > 0) {
    hints.push(
      `Counting shapes behind the text changed ${data.text.changedByShapes} result(s), shown as CHANGED below. On the study task files this should be 0.`
    );
  }
  if (data.build.commit === "unknown")
    hints.push(
      "The build has no commit recorded. Rebuild with npm run build inside the git folder."
    );
  return hints;
}
