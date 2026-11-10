import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import { CalendarContext, INERT, type CalendarValue } from "./CalendarContext";
import { SettingsPill } from "./SettingsPill";

afterEach(cleanup);

function mount(over: Partial<CalendarValue> = {}) {
  const value = {
    ...INERT,
    available: true,
    settings: DEFAULT_SETTINGS,
    userName: "Darlyn Gomez",
    settingsOpen: true,
    saveSettings: vi.fn(),
    reset: vi.fn(),
    closeSettings: vi.fn(),
    openSettings: vi.fn(),
    ...over
  };
  render(
    <CalendarContext.Provider value={value}>
      <SettingsPill />
    </CalendarContext.Provider>
  );
  return value;
}

describe("SettingsPill", () => {
  it("draws nothing when the calendar is off", () => {
    mount({ available: false });
    expect(screen.queryByRole("button", { name: /Settings/ })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens settings from the pill", () => {
    const value = mount({ settingsOpen: false });
    fireEvent.click(screen.getByRole("button", { name: /Settings/ }));
    expect(value.openSettings).toHaveBeenCalled();
  });
});

describe("SettingsScreen", () => {
  it("saves the whole settings object with one field changed", () => {
    const value = mount();
    fireEvent.click(screen.getByRole("button", { name: "5 times" }));
    expect(value.saveSettings).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, trigger: 5 });
    fireEvent.click(screen.getByRole("button", { name: "Outlook / .ics" }));
    expect(value.saveSettings).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, format: "ics" });
  });

  it("marks the chosen option and shows the name", () => {
    mount();
    expect(screen.getByRole("button", { name: "45 min" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Darlyn Gomez")).toBeInTheDocument();
  });

  it("shows the real thresholds and a reset that calls through", () => {
    const value = mount();
    fireEvent.click(screen.getByRole("button", { name: /Accessibility/ }));
    expect(screen.getByText(/4\.5:1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Preferences/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(value.reset).toHaveBeenCalled();
    expect(screen.getByText("Counts cleared.")).toBeInTheDocument();
  });

  it("tries event generation with a sample and comes back", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Test event generation" }));
    expect(screen.getByText("Schedule Focus Time")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("has one way out, the back arrow, and no Done, Return to Plugin or footer text", () => {
    const value = mount();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Return to Plugin/i })).toBeNull();
    expect(within(screen.getByRole("dialog")).queryByText("Avene")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(value.closeSettings).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape", () => {
    const value = mount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(value.closeSettings).toHaveBeenCalled();
  });

  it("leaves out the audit scope card from the accessibility tab", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Accessibility/ }));
    expect(screen.getByText(/4\.5:1/)).toBeInTheDocument();
    for (const text of [
      "Audit scope",
      "Text contrast",
      "Non-text UI components",
      "Hidden layers"
    ]) {
      expect(screen.queryByText(text)).toBeNull();
    }
  });
});

describe("the profile pill", () => {
  it("is only the initials in a circle, with no word beside it", () => {
    mount({ settingsOpen: false });
    const pill = screen.getByRole("button", { name: "Settings" });
    expect(pill).toHaveTextContent(/^DG$/);
    expect(pill.textContent).not.toMatch(/Settings/);
  });
});
