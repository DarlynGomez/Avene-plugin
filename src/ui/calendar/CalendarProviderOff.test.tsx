import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CalendarProvider } from "./CalendarProvider";
import { useCalendar } from "./CalendarContext";

vi.mock("../../shared/calendarFlags", async (original) => ({
  ...(await original<typeof import("../../shared/calendarFlags")>()),
  FEATURE_CALENDAR: false
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Probe() {
  return <p>{useCalendar().available ? "on" : "off"}</p>;
}

describe("the calendar with the flag off", () => {
  it("is off and sends nothing", () => {
    const post = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    render(
      <CalendarProvider>
        <Probe />
      </CalendarProvider>
    );
    expect(screen.getByText("off")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
});
