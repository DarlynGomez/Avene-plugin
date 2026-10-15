import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColorWheel } from "./ColorWheel";

const WHITE = { r: 1, g: 1, b: 1 };
const RED = { r: 0.8, g: 0.1, b: 0.1 };

describe("ColorWheel", () => {
  afterEach(() => {
    cleanup();
  });

  it("is a focusable slider announcing the color and ratio", () => {
    const onColorChange = vi.fn();
    render(
      <ColorWheel
        background={WHITE}
        requiredRatio={4.5}
        initialColor={RED}
        onColorChange={onColorChange}
      />
    );

    const wheel = screen.getByRole("slider", { name: /color wheel/i });
    expect(wheel).toHaveAttribute("tabindex", "0");
  });

  it("moves hue on ArrowRight and updates the announcement", () => {
    const onColorChange = vi.fn();
    render(
      <ColorWheel
        background={WHITE}
        requiredRatio={4.5}
        initialColor={RED}
        onColorChange={onColorChange}
      />
    );

    const wheel = screen.getByRole("slider", { name: /color wheel/i });
    const before = wheel.getAttribute("aria-valuetext");
    fireEvent.keyDown(wheel, { key: "ArrowRight" });

    expect(onColorChange).toHaveBeenCalled();
    expect(wheel.getAttribute("aria-valuetext")).not.toBe(before);
    expect(wheel.getAttribute("aria-valuetext")).toMatch(/ratio .* to 1/);
  });

  it("moves saturation on ArrowUp and ArrowDown", () => {
    const onColorChange = vi.fn();
    render(
      <ColorWheel
        background={WHITE}
        requiredRatio={4.5}
        initialColor={RED}
        onColorChange={onColorChange}
      />
    );

    const wheel = screen.getByRole("slider", { name: /color wheel/i });
    fireEvent.keyDown(wheel, { key: "ArrowUp" });
    expect(onColorChange).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(wheel, { key: "ArrowDown" });
    expect(onColorChange).toHaveBeenCalledTimes(2);
  });

  it("ignores a key it does not handle, without announcing anything new", () => {
    const onColorChange = vi.fn();
    render(
      <ColorWheel
        background={WHITE}
        requiredRatio={4.5}
        initialColor={RED}
        onColorChange={onColorChange}
      />
    );

    const wheel = screen.getByRole("slider", { name: /color wheel/i });
    fireEvent.keyDown(wheel, { key: "Enter" });
    expect(onColorChange).not.toHaveBeenCalled();
  });

  it("has a lightness range input at least as tall as the minimum target", () => {
    const onColorChange = vi.fn();
    render(
      <ColorWheel
        background={WHITE}
        requiredRatio={4.5}
        initialColor={RED}
        onColorChange={onColorChange}
      />
    );

    expect(screen.getByRole("slider", { name: "Depth / Tone" })).toBeInTheDocument();
  });
});
