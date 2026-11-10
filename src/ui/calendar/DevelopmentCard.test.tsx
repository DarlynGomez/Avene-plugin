import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AltChecksContext, INERT_ALT, type AltChecksValue } from "../handoff/alt/AltChecksContext";
import { DevelopmentCard } from "./DevelopmentCard";

afterEach(cleanup);

function mount(over: Partial<AltChecksValue> = {}) {
  const value = { ...INERT_ALT, available: true, resetAi: vi.fn(), ...over };
  render(
    <AltChecksContext.Provider value={value}>
      <DevelopmentCard />
    </AltChecksContext.Provider>
  );
  return value;
}

describe("the development reset card", () => {
  it("is not there when handoff is off or a study is running", () => {
    mount({ available: false });
    expect(screen.queryByText("Development")).toBeNull();
  });

  it("asks once more before it resets anything, and Cancel resets nothing", () => {
    const value = mount();
    fireEvent.click(screen.getByRole("button", { name: "Reset AI drafts" }));
    expect(value.resetAi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(value.resetAi).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Reset AI drafts" })).toBeInTheDocument();
  });

  it("resets once it is confirmed", () => {
    const value = mount();
    fireEvent.click(screen.getByRole("button", { name: "Reset AI drafts" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));
    expect(value.resetAi).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Confirm reset" })).toBeNull();
  });

  it("says what was cleared, in the singular and the plural, and the annotations when there were some", () => {
    mount({
      resetResult: {
        type: "HANDOFF_AI_RESET_RESULT",
        drafts: 1,
        suggestions: 5,
        notes: 2,
        annotationsRemoved: 1,
        annotationsLeft: 1
      }
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cleared 1 text draft, 5 saved suggestions and 2 AI-drafted notes. 1 annotation taken off the canvas, 1 left in place."
    );
  });

  it("says that notes written by hand stay", () => {
    mount();
    expect(screen.getByText(/Notes you wrote yourself stay/)).toBeInTheDocument();
  });
});
