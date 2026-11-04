import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FILE_URL, item } from "../../shared/calendar/fixtures";
import { DEFAULT_SETTINGS } from "../../shared/calendar/settings";
import { ScheduleSheet } from "./ScheduleSheet";

vi.mock("./downloadText", () => ({ downloadText: vi.fn() }));
import { downloadText } from "./downloadText";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function mount(items = [item()], over = {}) {
  const props = {
    items,
    settings: { ...DEFAULT_SETTINGS, ...over },
    fileUrl: FILE_URL,
    onOpenUrl: vi.fn(),
    onScheduled: vi.fn(),
    onClose: vi.fn()
  };
  render(<ScheduleSheet {...props} />);
  return props;
}

describe("ScheduleSheet", () => {
  it("names the deferral count for one item and the item count for a batch", () => {
    mount([item({ deferCount: 3 })]);
    expect(screen.getByText("Deferred 3x")).toBeInTheDocument();
    cleanup();
    mount([item(), item({ signature: "b" }), item({ signature: "c" })]);
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("opens only a Google render link and then closes as scheduled", () => {
    const props = mount();
    fireEvent.click(screen.getByRole("button", { name: /Open in Google Calendar/ }));
    expect(props.onOpenUrl).toHaveBeenCalledTimes(1);
    expect(props.onOpenUrl.mock.calls[0][0]).toMatch(
      /^https:\/\/calendar\.google\.com\/calendar\/render/
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onScheduled).toHaveBeenCalledWith([item().signature]);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("downloads an ics file", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Download .ICS/ }));
    const [name, text, mime] = vi.mocked(downloadText).mock.calls[0];
    expect(name).toBe("avene-focus-time.ics");
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(mime).toContain("text/calendar");
  });

  it("closes without scheduling when no calendar button was used", () => {
    const props = mount();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onScheduled).not.toHaveBeenCalled();
  });

  it("puts the ics button first when that is the chosen format", () => {
    mount([item()], { format: "ics" });
    const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const ics = names.findIndex((n) => n.includes(".ICS"));
    const google = names.findIndex((n) => n.includes("Google Calendar"));
    expect(ics).toBeLessThan(google);
  });

  it("blocks both buttons while a custom time is not a real moment", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Custom time/ }));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "" } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open in Google Calendar/ })).toBeDisabled();
  });
});
