import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("csv", () => {
  it("round trips commas, quotes and line breaks", () => {
    const rows = [
      ["a", 'He said "hi", twice', "line\nbreak"],
      ["", "x", "y"]
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it("reads a file with no final line break", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"]
    ]);
  });
});
