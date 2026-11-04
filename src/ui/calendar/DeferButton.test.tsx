import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import type { Root } from "../../shared/grouping/groupingTypes";
import { CalendarContext, INERT, type CalendarValue } from "./CalendarContext";
import { DeferButton } from "./DeferButton";

afterEach(cleanup);

const root = (displayState: string, open: number) =>
  ({ signature: "s", displayState, stateBreakdown: { open } }) as unknown as Root;

function mount(over: Partial<CalendarValue>, target: Root, onDefer = vi.fn()) {
  const value = { ...INERT, available: true, settings: DEFAULT_SETTINGS, ...over };
  render(
    <CalendarContext.Provider value={value}>
      <DeferButton root={target} onDefer={onDefer} className="b" />
    </CalendarContext.Provider>
  );
  return value;
}

describe("DeferButton", () => {
  it("defers and notes the deferral, with the count inside", () => {
    const onDefer = vi.fn();
    const noteDeferred = vi.fn();
    mount({ counts: { s: 2 }, noteDeferred }, root("open", 1), onDefer);
    fireEvent.click(screen.getByRole("button", { name: /Defer/ }));
    expect(onDefer).toHaveBeenCalled();
    expect(noteDeferred).toHaveBeenCalledWith("s");
    expect(screen.getByText("2x")).toBeInTheDocument();
  });

  it("hides the count when the calendar is off", () => {
    mount({ available: false, counts: { s: 2 } }, root("open", 1));
    expect(screen.queryByText("2x")).toBeNull();
  });

  it("offers focus time once the root is fully deferred", () => {
    const openFor = vi.fn();
    mount({ counts: { s: 3 }, openFor }, root("deferred", 0));
    fireEvent.click(screen.getByRole("button", { name: /deferred 3 times/ }));
    expect(openFor).toHaveBeenCalledWith("s");
  });

  it("draws nothing for a deferred root with no count", () => {
    mount({ counts: {} }, root("deferred", 0));
    expect(screen.queryByRole("button")).toBeNull();
  });
});
