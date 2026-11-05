import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ALT_BATCH_CAP } from "./suggestTypes";
import { capturePosts, layer, mountPanel } from "./altHarness";
import { described, emit, pluginResponder, stubServer } from "./altServers";

vi.mock("../../../shared/handoffFlags", async (original) => ({
  ...(await original<typeof import("../../../shared/handoffFlags")>()),
  FEATURE_ALT_SUGGEST_LIVE: true
}));

const SUGGESTED = "Order summary icon that opens the cart";
let posted: ReturnType<typeof capturePosts>;
let plugin: ReturnType<typeof pluginResponder>;

beforeEach(() => {
  plugin = pluginResponder();
  posted = capturePosts(plugin.handle);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const altSets = () => posted.filter((m) => m.type === "HANDOFF_ALT_SET");

async function openHero(layers?: ReturnType<typeof layer>[]) {
  const user = userEvent.setup();
  await mountPanel(layers ? { layers } : {});
  await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
  await user.click(screen.getAllByRole("button", { name: "Add note" })[0]);
  return user;
}

const suggestion = () => screen.findByRole("region", { name: "AI suggestion" });

describe("Suggest for one layer", () => {
  it("shows an AI suggestion under the field and does not put it in the field or in a note", async () => {
    stubServer(() => described(SUGGESTED));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    const box = await suggestion();
    expect(within(box).getByText(SUGGESTED)).toBeInTheDocument();
    expect(within(box).getByText("AI suggestion")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(altSets()).toEqual([]);
  });

  it("sends the layer's picture and its size to the local server and nothing else", async () => {
    const { fetchStub } = stubServer(() => described(SUGGESTED));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    const [url, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:8750/v1/alt");
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(["height", "image", "requestId", "width"]);
    expect(body.image).toBe("iVBORw==");
    expect(JSON.stringify(body)).not.toContain("Hero");
  });

  it("saves with the source ai only when Use this is pressed", async () => {
    stubServer(() => described(SUGGESTED));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    expect(altSets()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Use this" }));
    expect(altSets()).toEqual([
      { type: "HANDOFF_ALT_SET", nodeId: "9:1", text: SUGGESTED, decorative: false, source: "ai" }
    ]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("puts the text in the field on Edit, and saves ai if it is kept and ai_edited if it is changed", async () => {
    stubServer(() => described(SUGGESTED));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Description")).toHaveValue(SUGGESTED);
    expect(altSets()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(altSets()[0]).toMatchObject({ text: SUGGESTED, source: "ai" });
    cleanup();
    posted.length = 0;
    const again = await openHero();
    await again.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    await again.click(screen.getByRole("button", { name: "Edit" }));
    await again.type(screen.getByLabelText("Description"), " today");
    await again.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(altSets()[0]).toMatchObject({ text: `${SUGGESTED} today`, source: "ai_edited" });
  });

  it("gives a note the designer writes the source designer, whatever was suggested", async () => {
    stubServer(() => described(SUGGESTED));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("My own words");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(altSets()[0]).toMatchObject({ text: "My own words", source: "designer" });
  });

  it("removes the suggestion on Dismiss and writes nothing", async () => {
    stubServer(() => described(SUGGESTED));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("region", { name: "AI suggestion" })).toBeNull();
    expect(altSets()).toEqual([]);
  });

  it("offers a decorative suggestion without ticking anything, and saves it only after the designer confirms", async () => {
    stubServer(() => ({ kind: "decorative", text: "", reason: "ok", model: "vision:v1", ms: 5 }));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    const box = await suggestion();
    expect(within(box).getByText("This image looks decorative.")).toBeInTheDocument();
    expect(screen.getByLabelText(/This image is decorative/)).not.toBeChecked();
    expect(altSets()).toEqual([]);
    await user.click(within(box).getByRole("button", { name: "Mark as decorative" }));
    expect(screen.getByLabelText(/This image is decorative/)).toBeChecked();
    expect(altSets()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(altSets()[0]).toMatchObject({ decorative: true, text: "", source: "designer" });
  });
});

describe("when there is no suggestion", () => {
  it("drops a rejected one and shows no model text", async () => {
    stubServer(() => described("Image of a very secret cafe"));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    expect(await screen.findByText("No suggestion available.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("secret");
    expect(screen.queryByRole("region", { name: "AI suggestion" })).toBeNull();
  });

  it("says one plain line when the model cannot tell, and an unsure reply has no text", async () => {
    stubServer(() => ({ kind: "unsure", text: "", reason: "ok", model: "m", ms: 1 }));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    expect(
      await screen.findByText(/The model could not tell what this image shows/)
    ).toBeInTheDocument();
  });

  it("treats the server being down as normal: one plain line, no alert, and a note can still be written", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    expect(await screen.findByText(/not reachable right now/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByLabelText("Description"));
    await user.paste("Written by hand");
    await user.click(screen.getByRole("button", { name: "Save alt text" }));
    expect(altSets()[0]).toMatchObject({ text: "Written by hand", source: "designer" });
  });

  it("falls back when the picture of the layer cannot be read", async () => {
    stubServer(() => described(SUGGESTED));
    posted = capturePosts((m) => {
      if (m.type === "HANDOFF_ALT_CROP_REQUEST") {
        setTimeout(
          () =>
            emit({
              type: "HANDOFF_ALT_CROP",
              nodeId: m.nodeId,
              ok: false,
              reason: "export-failed"
            }),
          0
        );
      }
    });
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    expect(
      await screen.findByText(/A picture of this layer could not be read/)
    ).toBeInTheDocument();
  });
});

describe("a saved suggestion", () => {
  it("is kept in the file with the picture and the model after a live one", async () => {
    stubServer(() => described(SUGGESTED, "vision:v7"));
    const user = await openHero();
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    await suggestion();
    const saved = posted.filter((m) => m.type === "HANDOFF_ALT_CACHE_SET");
    expect(saved).toHaveLength(1);
    expect(saved[0].entries).toMatchObject([
      { imageHash: "h-hero", modelId: "vision:v7", kind: "describe", text: SUGGESTED }
    ]);
  });

  it("looks exactly like a live one and makes no call to the server", async () => {
    stubServer(() => described(SUGGESTED, "vision:v7"));
    const live = await openHero();
    await live.click(screen.getByRole("button", { name: "Suggest" }));
    const liveHtml = (await suggestion()).outerHTML;
    cleanup();

    const { fetchStub } = stubServer(() => {
      throw new Error("the server must not be asked");
    });
    plugin = pluginResponder(plugin.entries);
    posted = capturePosts(plugin.handle);
    const saved = await openHero();
    await saved.click(screen.getByRole("button", { name: "Suggest" }));
    const savedHtml = (await suggestion()).outerHTML;
    expect(savedHtml).toBe(liveHtml);
    expect(fetchStub).not.toHaveBeenCalled();
    expect(posted.some((m) => m.type === "HANDOFF_ALT_CROP_REQUEST")).toBe(false);
  });

  it("is found for every layer that uses the same picture", async () => {
    plugin = pluginResponder([
      {
        imageHash: "h-avatar",
        modelId: "vision:v1",
        kind: "describe",
        text: "A profile photo",
        at: "2026-11-05T10:00:00.000Z"
      }
    ]);
    posted = capturePosts(plugin.handle);
    const { fetchStub } = stubServer(() => described("never asked"));
    const user = userEvent.setup();
    await mountPanel();
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    await user.click(screen.getAllByRole("button", { name: "Add note" })[1]);
    await user.click(screen.getByRole("button", { name: "Suggest" }));
    expect(within(await suggestion()).getByText("A profile photo")).toBeInTheDocument();
    expect(fetchStub).not.toHaveBeenCalled();
  });
});

describe("Suggest for all unanswered", () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => layer(`7:${i}`, `h${i}`, `Image ${i}`));

  async function startBatch(n: number) {
    const user = userEvent.setup();
    await mountPanel({ layers: many(n) });
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    return user;
  }

  it("runs one image at a time and shows how far it has got", async () => {
    const { state } = stubServer((call) => described(`Description number ${call}`));
    const user = await startBatch(3);
    await user.click(screen.getByRole("button", { name: "Suggest for all unanswered" }));
    await waitFor(() => expect(state.calls).toBe(3));
    await waitFor(() => expect(screen.queryByText(/^\d+ of 3$/)).toBeNull());
    expect(state.mostOpen).toBe(1);
    expect(screen.getAllByText("AI suggestion ready")).toHaveLength(3);
  });

  it("shows the count while it works, and Cancel stops it after the one in flight", async () => {
    let release: () => void = () => undefined;
    const { state } = stubServer((call) =>
      call === 1
        ? new Promise((resolve) => (release = () => resolve(described("First one"))))
        : described("More")
    );
    const user = await startBatch(4);
    await user.click(screen.getByRole("button", { name: "Suggest for all unanswered" }));
    expect(await screen.findByText("0 of 4")).toBeInTheDocument();
    await waitFor(() => expect(state.calls).toBe(1));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => release());
    await waitFor(() => expect(screen.queryByText(/^\d+ of 4$/)).toBeNull());
    expect(state.calls).toBe(1);
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("stops at the cap for one run and says so", async () => {
    const { state } = stubServer(() => described("A sentence"));
    const user = await startBatch(ALT_BATCH_CAP + 3);
    await user.click(screen.getByRole("button", { name: "Suggest for all unanswered" }));
    await waitFor(() => expect(screen.getByText(/Stopped after/)).toBeInTheDocument(), {
      timeout: 20000
    });
    expect(state.calls).toBe(ALT_BATCH_CAP);
  }, 30000);

  it("stops with one plain line when the server cannot be reached, and leaves the layers as they were", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = await startBatch(3);
    await user.click(screen.getByRole("button", { name: "Suggest for all unanswered" }));
    expect(await screen.findByText(/not reachable right now/)).toBeInTheDocument();
    expect(screen.queryByText("AI suggestion ready")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(altSets()).toEqual([]);
  });

  it("offers Prepare suggestions only while the live path is on, and writes no note", async () => {
    stubServer(() => described("A sentence"));
    const user = await startBatch(2);
    await user.click(screen.getByRole("button", { name: "Prepare suggestions" }));
    await waitFor(() =>
      expect(posted.filter((m) => m.type === "HANDOFF_ALT_CACHE_SET").length).toBeGreaterThan(0)
    );
    expect(altSets()).toEqual([]);
  });
});

describe("the label after saving", () => {
  const at = "2026-11-05T10:00:00.000Z";
  it.each([
    ["ai", "AI-drafted"],
    ["ai_edited", "AI-drafted, edited"]
  ] as const)("says %s as %s on the card and in the sheet", async (source, label) => {
    const user = userEvent.setup();
    await mountPanel({
      layers: [layer("9:1", "a", "Hero")],
      notes: { "9:1": [{ category: "alt", text: "A hero", source, updatedAt: at }] }
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    expect(screen.getByText(label)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit note" }));
    expect(screen.getAllByText(label).length).toBeGreaterThan(1);
  });

  it("is not on a note the designer wrote", async () => {
    const user = userEvent.setup();
    await mountPanel({
      layers: [layer("9:1", "a", "Hero")],
      notes: { "9:1": [{ category: "alt", text: "A hero", updatedAt: at }] }
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Check" }), "alt");
    expect(screen.queryByText(/AI-drafted/)).toBeNull();
    emit({ type: "HANDOFF_ALT_CACHE", entries: [] });
  });
});
