import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import { CalendarTab } from "./CalendarTab";

afterEach(cleanup);

describe("the calendar settings tab in the study build", () => {
  it("has no format choice and no mention of Google", () => {
    render(
      <CalendarTab
        settings={DEFAULT_SETTINGS}
        onChange={() => undefined}
        onTest={() => undefined}
      />
    );
    expect(screen.queryByText("Format")).toBeNull();
    expect(screen.queryByText(/Google/)).toBeNull();
    expect(screen.getByText("Focus scheduling rules")).toBeInTheDocument();
  });
});
