import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";

import { ReviewerBox } from "./ReviewerBox";

afterEach(cleanup);

describe("the reviewer field in the study build", () => {
  it("is labeled Reviewer and does not ask for a full name", () => {
    render(<ReviewerBox name="" onChange={() => undefined} />);
    expect(screen.getByLabelText(/^Reviewer/)).toBeInTheDocument();
    expect(screen.queryByText(/full name/i)).toBeNull();
  });
});
