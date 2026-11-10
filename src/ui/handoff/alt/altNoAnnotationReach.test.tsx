import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { capturePosts, layer, mountPanel, openAlt } from "./altHarness";
import { described, pluginResponder, stubServer } from "./altServers";

vi.mock("../../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../../shared/handoffFlags")>()),
  FEATURE_ALT_ANNOTATIONS: true,
  FEATURE_ALT_SUGGEST_LIVE: true
}));

// A long path through the panel, so a loaded machine needs longer than the default
vi.setConfig({ testTimeout: 15000 });

const WRITES = ["HANDOFF_ANNOTATE", "HANDOFF_ANNOTATION_UPDATE", "HANDOFF_ANNOTATION_REMOVE"];
let posted: ReturnType<typeof capturePosts>;

beforeEach(() => {
  posted = capturePosts(pluginResponder().handle);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const writes = () => posted.filter((m) => WRITES.includes(m.type));

describe("the code behind Suggest, Apply to all and Prepare", () => {
  it("never names an annotation message, in the source", () => {
    for (const file of [
      "useAltSuggest.ts",
      "useAltNoteForm.ts",
      "useSuggestCache.ts",
      "useAltCrop.ts",
      "AltSuggestBar.tsx",
      "AltSuggestBox.tsx",
      "suggestState.ts",
      "suggestTypes.ts"
    ]) {
      const source = readFileSync(resolve(process.cwd(), "src/ui/handoff/alt", file), "utf8");
      expect(source, file).not.toMatch(
        /HANDOFF_ANNOTAT|annotate\(|updateAnnotation|removeAnnotation/
      );
    }
  });

  it("sends no annotation write when a suggestion is used, edited, applied to all layers or prepared, with annotations on", async () => {
    stubServer(() => described("Order summary icon that opens the cart"));
    const user = userEvent.setup();
    await mountPanel({
      layers: [layer("9:1", "h1", "A"), layer("9:2", "h1", "B"), layer("9:3", "h2", "C")]
    });
    await openAlt(user);

    await user.click(screen.getByRole("button", { name: "Prepare suggestions" }));
    await waitFor(() => expect(screen.queryByText(/^\d+ of \d+$/)).toBeNull());
    await user.click(screen.getByRole("button", { name: "Suggest for all unanswered" }));
    await waitFor(() => expect(screen.queryByText(/^\d+ of \d+$/)).toBeNull());

    await user.click(screen.getAllByRole("button", { name: "Add Note" })[0]);
    await user.click(screen.getByLabelText(/Apply this note to all 2 layers/));
    await user.click(screen.getByRole("button", { name: "Generate with AI" }));
    await user.click(await screen.findByRole("button", { name: "Use this" }));

    expect(posted.filter((m) => m.type === "HANDOFF_ALT_SET")).toHaveLength(2);
    expect(writes()).toEqual([]);
  });
});
