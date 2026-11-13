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

function mount() {
  const props = {
    items: [item()],
    settings: DEFAULT_SETTINGS,
    fileUrl: FILE_URL,
    onOpenUrl: vi.fn(),
    onScheduled: vi.fn(),
    onClose: vi.fn()
  };
  render(<ScheduleSheet {...props} />);
  return props;
}

describe("the schedule sheet in the study build", () => {
  it("has no Google Calendar button, only the file", () => {
    mount();
    expect(screen.queryByText(/Google/)).toBeNull();
    expect(screen.getByRole("button", { name: /Download \.ICS file/ })).toBeInTheDocument();
  });

  it("downloads the file and never opens an address", () => {
    const props = mount();
    fireEvent.click(screen.getByRole("button", { name: /Download \.ICS file/ }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    expect(props.onOpenUrl).not.toHaveBeenCalled();
  });
});
