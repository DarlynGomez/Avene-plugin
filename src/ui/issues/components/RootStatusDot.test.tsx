import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import { RootStatusDot } from "./RootStatusDot";

describe("RootStatusDot", () => {
  afterEach(cleanup);

  it.each([
    ["open", "Open"],
    ["important", "Pinned"],
    ["deferred", "Deferred"]
  ] as const)("shows the word for the %s state", (state, word) => {
    render(<RootStatusDot displayState={state} />);

    expect(screen.getByText(word)).toBeVisible();
  });

  it("does not announce the dot as a separate image", () => {
    const { container } = render(<RootStatusDot displayState="open" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument();
  });

  it("renders nothing for a decided root", () => {
    const { container } = render(<RootStatusDot displayState="decided" />);

    expect(container).toBeEmptyDOMElement();
  });
});
