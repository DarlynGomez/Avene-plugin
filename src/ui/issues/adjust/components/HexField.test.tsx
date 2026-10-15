import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HexField } from "./HexField";

const WHITE = { r: 1, g: 1, b: 1 };

describe("HexField", () => {
  afterEach(() => {
    cleanup();
  });

  it("reports a valid, passing hex and clears aria-invalid", () => {
    const onColorChange = vi.fn();
    render(<HexField background={WHITE} requiredRatio={4.5} onColorChange={onColorChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Type a hex color" }), {
      target: { value: "#000000" }
    });

    expect(onColorChange).toHaveBeenCalledWith({ r: 0, g: 0, b: 0 });
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
  });

  it("sets aria-invalid and shows an error for malformed input", () => {
    const onColorChange = vi.fn();
    render(<HexField background={WHITE} requiredRatio={4.5} onColorChange={onColorChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Type a hex color" }), {
      target: { value: "not-a-hex" }
    });

    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("not a valid hex color");
    expect(onColorChange).toHaveBeenLastCalledWith(null);
  });

  it("reports the achieved and required ratio for a hex that fails contrast", () => {
    const onColorChange = vi.fn();
    render(<HexField background={WHITE} requiredRatio={4.5} onColorChange={onColorChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Type a hex color" }), {
      target: { value: "#eeeeee" }
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/achieved/);
    expect(screen.getByRole("alert")).toHaveTextContent(/required/);
    expect(onColorChange).toHaveBeenLastCalledWith(null);
  });

  it("offers a one-tap nearest passing alternative that becomes the new value", () => {
    const onColorChange = vi.fn();
    render(<HexField background={WHITE} requiredRatio={4.5} onColorChange={onColorChange} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Type a hex color" }), {
      target: { value: "#dddddd" }
    });

    const alternative = screen.getByRole("button", { name: /nearest passing color/i });
    fireEvent.click(alternative);

    expect(onColorChange).toHaveBeenLastCalledWith(expect.objectContaining({ r: expect.any(Number) }));
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
  });
});
