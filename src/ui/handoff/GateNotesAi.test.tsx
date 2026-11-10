import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import { buildAudienceDoc } from "../../shared/handoff/audiences";
import { sampleInput } from "../../shared/handoff/draftFixtures";
import { GateNotes } from "./GateNotes";

afterEach(cleanup);
const doc = buildAudienceDoc(sampleInput(), "developer");

describe("the review gate line for AI-drafted alt text", () => {
  it.each([
    [1, "1 alt text note is AI-drafted."],
    [3, "3 alt text notes are AI-drafted."]
  ])("says how many for %s", (count, text) => {
    render(<GateNotes doc={doc} draftWarnings={[]} aiAltNotes={count} />);
    expect(screen.getByText(new RegExp(text.replace(".", "\\.")))).toBeInTheDocument();
  });

  it("says nothing when there are none, which is the gate as it was", () => {
    const { container } = render(<GateNotes doc={doc} draftWarnings={[]} aiAltNotes={0} />);
    const before = render(<GateNotes doc={doc} draftWarnings={[]} />);
    expect(container.innerHTML).toBe(before.container.innerHTML);
    expect(screen.queryByText(/AI-drafted/)).toBeNull();
  });
});
