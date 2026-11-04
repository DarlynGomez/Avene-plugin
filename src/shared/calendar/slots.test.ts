import { describe, expect, it } from "vitest";

import {
  customStart,
  dayLabel,
  endOf,
  fieldValues,
  formatClock,
  localStamp,
  nextWorkday,
  partLabel,
  suggestStart,
  utcStamp
} from "./slots";

const monday = new Date(2026, 10, 2, 9, 30);
const friday = new Date(2026, 10, 6, 16, 0);
const saturday = new Date(2026, 10, 7, 11, 0);

describe("nextWorkday", () => {
  it("is the next day in the middle of the week", () => {
    expect(nextWorkday(monday)).toEqual(new Date(2026, 10, 3));
  });

  it.each([friday, saturday])("skips the weekend from %s", (from) => {
    expect(nextWorkday(from)).toEqual(new Date(2026, 10, 9));
  });

  it("crosses a month end", () => {
    expect(nextWorkday(new Date(2026, 9, 30, 12))).toEqual(new Date(2026, 10, 2));
  });
});

describe("suggestStart", () => {
  it("is ten in the morning or two in the afternoon", () => {
    expect(suggestStart(monday, "morning")).toEqual(new Date(2026, 10, 3, 10, 0));
    expect(suggestStart(monday, "afternoon")).toEqual(new Date(2026, 10, 3, 14, 0));
  });
});

describe("labels", () => {
  it("says tomorrow, or the weekday when tomorrow is not a working day", () => {
    expect(dayLabel(monday, suggestStart(monday, "morning"))).toBe("Tomorrow");
    expect(dayLabel(friday, suggestStart(friday, "morning"))).toBe("Monday");
    expect(dayLabel(saturday, suggestStart(saturday, "afternoon"))).toBe("Monday");
  });

  it("names the part of the day and formats the clock on twelve hours", () => {
    expect(partLabel(new Date(2026, 10, 3, 10))).toBe("morning");
    expect(partLabel(new Date(2026, 10, 3, 14))).toBe("afternoon");
    expect(formatClock(new Date(2026, 10, 3, 10, 0))).toBe("10:00 AM");
    expect(formatClock(new Date(2026, 10, 3, 14, 5))).toBe("2:05 PM");
    expect(formatClock(new Date(2026, 10, 3, 0, 0))).toBe("12:00 AM");
    expect(formatClock(new Date(2026, 10, 3, 12, 30))).toBe("12:30 PM");
  });
});

describe("customStart", () => {
  it("reads a date and a time as local wall time", () => {
    expect(customStart("2026-11-03", "14:00")).toEqual(new Date(2026, 10, 3, 14, 0));
  });

  it.each([
    ["", "14:00"],
    ["2026-11-03", ""],
    ["2026-13-03", "14:00"],
    ["2026-02-30", "14:00"],
    ["2026-11-03", "24:00"],
    ["2026-11-03", "14:60"],
    ["11/03/2026", "14:00"],
    ["2026-11-03", "2:00 PM"]
  ])("refuses %s %s", (date, time) => {
    expect(customStart(date, time)).toBeNull();
  });
});

describe("stamps", () => {
  it("writes local time with no zone and utc time with a Z", () => {
    const date = new Date(2026, 10, 3, 10, 5, 9);
    expect(localStamp(date)).toBe("20261103T100509");
    expect(utcStamp(date)).toMatch(/^\d{8}T\d{6}Z$/);
    expect(utcStamp(new Date(Date.UTC(2026, 10, 3, 1, 2, 3)))).toBe("20261103T010203Z");
  });

  it("adds minutes and gives the values for the two fields", () => {
    expect(endOf(new Date(2026, 10, 3, 10, 0), 15)).toEqual(new Date(2026, 10, 3, 10, 15));
    expect(endOf(new Date(2026, 10, 3, 23, 50), 45)).toEqual(new Date(2026, 10, 4, 0, 35));
    expect(fieldValues(new Date(2026, 10, 3, 14, 0))).toEqual({
      date: "2026-11-03",
      time: "14:00"
    });
  });
});
