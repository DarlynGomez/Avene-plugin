import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReviewPanel } from "./ReviewPanel";
import { useRoleReview } from "./useRoleReview";

const saveTextFile = vi.fn();
vi.mock("../study/downloadFile", () => ({
  saveTextFile: (...args: unknown[]) => saveTextFile(...args)
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveTextFile.mockReset();
});

describe("the export panel", () => {
  it("offers the file for download", async () => {
    render(<ReviewPanel ui={{ status: "export", count: 3, csv: "a,b\n" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("3 text layers hold a suggestion");
    await userEvent.click(screen.getByRole("button", { name: "Download suggestions" }));
    expect(saveTextFile).toHaveBeenCalledWith("role-suggestions.csv", "a,b\n");
  });

  it("offers nothing to download when there is nothing", () => {
    render(<ReviewPanel ui={{ status: "export", count: 0, csv: "" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("the import panel", () => {
  it("reads the chosen file as text and posts it to the sandbox", async () => {
    const post = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    render(<ReviewPanel ui={{ status: "import", result: null }} />);
    const file = new File(["node id\n1:2\n"], "review.csv", { type: "text/csv" });
    await userEvent.upload(screen.getByLabelText("Reviewed file"), file);
    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        { pluginMessage: { type: "ROLE_REVIEW_IMPORT", csv: "node id\n1:2\n" } },
        "*"
      )
    );
  });

  it("shows the counts and nothing else", () => {
    render(
      <ReviewPanel
        ui={{
          status: "import",
          result: {
            imported: 4,
            removed: 1,
            notFound: 2,
            layerChanged: 3,
            labelNotOnList: 0,
            unreadable: false
          }
        }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Imported 4, removed 1. Skipped: not found 2, layer changed since export 3, label not on the list 0."
    );
  });

  it("says when the file is not an export", () => {
    render(
      <ReviewPanel
        ui={{
          status: "import",
          result: {
            imported: 0,
            removed: 0,
            notFound: 0,
            layerChanged: 0,
            labelNotOnList: 0,
            unreadable: true
          }
        }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("not a role suggestions export");
  });
});

describe("the review hook", () => {
  function Probe() {
    const ui = useRoleReview();
    return <p>{ui.status}</p>;
  }

  it("asks the sandbox on mount and follows the mode it is told", async () => {
    const post = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
    render(<Probe />);
    expect(post).toHaveBeenCalledWith({ pluginMessage: { type: "ROLE_REVIEW_SUBSCRIBE" } }, "*");
    expect(screen.getByText("idle")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { pluginMessage: { type: "ROLE_REVIEW_MODE", mode: "import" } }
        })
      );
    });
    expect(screen.getByText("import")).toBeInTheDocument();
  });
});
