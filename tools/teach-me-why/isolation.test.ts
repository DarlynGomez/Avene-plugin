import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("the generation tool", () => {
  it("is never imported by anything under src", () => {
    const offenders = sources(join(__dirname, "../../src")).filter((file) =>
      /tools\/|from "openai"/.test(readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});
