import { describe, expect, it } from "vitest";
import { analyzeTask, distinctKeys, reviewRowKeys } from "./coverageLogic";
import { coverageCsv, totals } from "./coverageReport";
import { parseGroundTruth } from "./groundTruth";

const header = "task,screen,id,text,fg,bg,size,weight,role,root";
// #AAAAAA on white is about 2.32 and needs 4.5 at 16px, bold 24px needs only 3
const csv = [
  header,
  "A,home,n1,Welcome,#AAAAAA,#FFFFFF,16,400,body,R1",
  "A,home,n2,Intro,#AAAAAA,#FFFFFF,16,400,caption,R1",
  "A,home,n3,Sign up,#BBBBBB,#FFFFFF,24,700,button text,R2",
  "A,home,n4,Passing,#000000,#FFFFFF,16,400,body,",
  "B,list,n5,Title,#CCCCCC,#FFFFFF,32,400,heading,R9"
].join("\n");

describe("parseGroundTruth", () => {
  it("reads rows in order and maps the button alias", () => {
    const { rows, errors } = parseGroundTruth(csv.replace("button text,R2", "button,R2"));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(5);
    expect(rows[2].role).toBe("button text");
  });
  it("reports a missing column, a bad role and a bad size without guessing", () => {
    expect(parseGroundTruth("task,screen\nA,b").errors[0]).toContain("Missing columns");
    const bad = parseGroundTruth(
      `${header}\nA,s,n1,t,#000,#fff,16,400,paragraph,R1\nA,s,n2,t,#000,#fff,big,400,body,R1`
    );
    expect(bad.errors).toHaveLength(2);
    expect(bad.rows).toEqual([]);
  });
});

describe("analyzeTask", () => {
  const rows = parseGroundTruth(csv).rows.filter((row) => row.task === "A");

  it("counts only failing nodes and groups them with the plugin's own roots", () => {
    const { coverage } = analyzeTask("A", rows);
    expect(coverage.failingInstances).toBe(3);
    expect(coverage.roots).toHaveLength(2);
    const first = coverage.roots.find((r) => r.instances === 2);
    expect(first).toMatchObject({ representative: "n1", required: 4.5, role: "body" });
    expect(first?.measured).toBeCloseTo(2.32, 1);
  });

  it("builds the key from the representative, using the plugin's size and severity", () => {
    const { coverage } = analyzeTask("A", rows);
    const normal = coverage.roots.find((r) => r.instances === 2);
    const large = coverage.roots.find((r) => r.instances === 1);
    expect(normal?.key).toEqual({ role: "body", severity: "medium", size: "normal", depth: 1 });
    expect(large?.key.size).toBe("large");
    expect(large?.key.role).toBe("button text");
  });

  it("flags a csv role that differs from the rule decided role, and none exists today", () => {
    const today = analyzeTask("A", rows).coverage.roots[0];
    expect(today.ruleRole).toBeNull();
    expect(today.notes.join(" ")).toContain("plugin decides none");
    const decided = analyzeTask("A", rows, (row) =>
      row.id === "n1" ? "heading" : row.role
    ).coverage;
    const root = decided.roots.find((r) => r.representative === "n1");
    expect(root?.notes.join(" ")).toContain("csv role body but the plugin decides heading");
    expect(root?.ruleRole).toBe("heading");
    const agreeing = decided.roots.find((r) => r.representative === "n3");
    expect(agreeing?.notes).toEqual([]);
  });

  it("notes a csv root label that the plugin splits", () => {
    const split = parseGroundTruth(
      `${header}\nA,s,a1,t,#AAAAAA,#FFFFFF,16,400,body,R1\nA,s,a2,t,#BBBBBB,#FFFFFF,16,400,body,R1`
    ).rows;
    const roots = analyzeTask("A", split, (row) => row.role).coverage.roots;
    expect(roots).toHaveLength(2);
    expect(roots[0].notes.join(" ")).toContain("split across several plugin roots");
  });

  it("lists a key for every one of the seven roles when any role can occur", () => {
    const root = analyzeTask("A", rows).coverage.roots[0];
    expect(root.anyRoleKeys.map((k) => k.role).sort()).toEqual(
      ["body", "button text", "caption", "decorative", "heading", "label", "unknown"].sort()
    );
    expect(new Set(root.anyRoleKeys.map((k) => k.severity)).size).toBe(1);
  });

  it("reports an unreadable color", () => {
    const { errors } = analyzeTask(
      "A",
      parseGroundTruth(`${header}\nA,s,a,t,nope,#FFFFFF,16,400,body,R1`).rows
    );
    expect(errors[0]).toContain("not a hex color");
  });
});

describe("totals and outputs", () => {
  const rows = parseGroundTruth(csv).rows;
  const tasks = ["A", "B"].map(
    (t) =>
      analyzeTask(
        t,
        rows.filter((r) => r.task === t)
      ).coverage
  );

  it("counts the three scenarios apart", () => {
    const found = totals(tasks);
    expect(found.groundTruth).toHaveLength(3);
    expect(found.asBuilt.every((key) => key.startsWith("unknown:"))).toBe(true);
    // Two distinct severity and size pairs across the tasks, times seven roles
    expect(found.anyRole).toHaveLength(14);
    expect(found.perTask.A).toHaveLength(2);
  });
  it("writes three review rows per distinct key, depth last, as review.csv does", () => {
    expect(reviewRowKeys(["body:low:normal"])).toEqual([
      "body:low:normal:1",
      "body:low:normal:2",
      "body:low:normal:3"
    ]);
    expect(distinctKeys([tasks[0].roots[0].key, tasks[0].roots[0].key])).toHaveLength(1);
  });
  it("writes one csv row per root", () => {
    expect(coverageCsv(tasks).trim().split("\r\n")).toHaveLength(1 + 3);
  });
});
