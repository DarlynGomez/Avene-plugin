import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DownloadMenu } from "./DownloadMenu";

afterEach(cleanup);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(HERE, "DownloadMenu.module.css"), "utf8");

const trigger = () => screen.getByRole("button", { name: "Download" });

describe("the download menu", () => {
  it("is one button that is closed to begin with, and says what it opens", () => {
    render(<DownloadMenu onPick={() => undefined} />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens to PDF and then HTML, with the first one focused", () => {
    render(<DownloadMenu onPick={() => undefined} />);
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(["PDF", "HTML"]);
    expect(screen.getByRole("menuitem", { name: "PDF" })).toHaveFocus();
  });

  it("passes the kind on and closes, with focus back on the button", () => {
    const onPick = vi.fn();
    render(<DownloadMenu onPick={onPick} />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("menuitem", { name: "HTML" }));
    expect(onPick).toHaveBeenCalledWith("html");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("moves with the arrow keys, wraps round, and closes on Escape without leaving the button", () => {
    render(<DownloadMenu onPick={() => undefined} />);
    fireEvent.click(trigger());
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "HTML" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "PDF" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "HTML" })).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click elsewhere and on the button itself", () => {
    render(
      <div>
        <DownloadMenu onPick={() => undefined} />
        <p>elsewhere</p>
      </div>
    );
    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByText("elsewhere"));
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger());
    fireEvent.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("the look", () => {
  it("is dark with light text, uses tokens only, and has a focus ring", () => {
    expect(css).toMatch(/\.trigger\s*\{[^}]*background:\s*var\(--color-accent\)/);
    expect(css).toMatch(/\.trigger\s*\{[^}]*color:\s*var\(--color-accent-text\)/);
    expect(css).toMatch(/\.item:focus-visible/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
