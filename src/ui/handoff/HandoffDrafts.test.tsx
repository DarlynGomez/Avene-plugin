import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DraftCache } from "../../shared/handoff/draftCache";
import { reword } from "../../shared/handoff/draftFixtures";
import { copyText } from "../study/downloadFile";
import { emit, handoffData, showText } from "./fixtures";
import { HandoffTab } from "./HandoffTab";

vi.mock("../study/downloadFile", () => ({
  copyText: vi.fn().mockResolvedValue(true),
  saveTextFile: vi.fn()
}));

interface Body {
  audience: string;
  blockId: string;
  lines: string[];
}
type Handler = (body: Body) => object | Error;

const good: Handler = (body) => ({
  sentences: reword(body.lines),
  reason: "ok",
  model: "text-model:test",
  ms: 4,
  blockId: body.blockId
});

let posted: { type: string; [key: string]: unknown }[];
let sent: Body[];

function stubServer(handler: Handler = good) {
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Body;
      sent.push(body);
      const out = handler(body);
      if (out instanceof Error) throw out;
      return new Response(JSON.stringify(out), { status: 200 });
    })
  );
}

beforeEach(() => {
  vi.mocked(copyText).mockResolvedValue(true);
  vi.mocked(copyText).mockClear();
  posted = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((message: unknown) => {
    posted.push((message as { pluginMessage: (typeof posted)[number] }).pluginMessage);
  });
  stubServer();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mount(drafts: DraftCache = {}) {
  render(<HandoffTab />);
  act(() => emit({ ...handoffData(), drafts }));
  showText();
  // the drafts live in the review sheet, which stays open for these tests
  fireEvent.click(screen.getByRole("button", { name: "Review and copy" }));
}

const aiCards = () => screen.getAllByRole("button", { name: /^AI Rewrite/ });
const templateCards = () => screen.getAllByRole("button", { name: /^Template \(Standard\)/ });

async function draftThisVersion() {
  fireEvent.click(screen.getByRole("button", { name: "Draft this version" }));
  await screen.findByText(/Drafts are ready to look at|helper|stays/i, {
    selector: "[role=status]"
  });
}

async function copyAs(name: string): Promise<string> {
  const gate = screen.getByRole("dialog");
  fireEvent.change(within(gate).getByLabelText(/Reviewer full name/), { target: { value: name } });
  await act(async () =>
    fireEvent.click(within(gate).getByRole("button", { name: "Finalize and copy" }))
  );
  return vi.mocked(copyText).mock.calls.at(-1)?.[0] ?? "";
}

const savedDrafts = (): DraftCache =>
  (posted.filter((m) => m.type === "HANDOFF_DRAFTS_SET").at(-1)?.drafts ?? {}) as DraftCache;

describe("drafting", () => {
  it("sends ids and template words only, never a name, color or file name", async () => {
    mount();
    await draftThisVersion();
    expect(sent.length).toBeGreaterThan(0);
    const body = JSON.stringify(sent);
    for (const secret of [
      "Helper text",
      "Price label",
      "Payment",
      "#9A9A9A",
      "#777777",
      "Checkout"
    ]) {
      expect(body, secret).not.toContain(secret);
    }
    expect(body).toContain("{L1}");
  });

  it("shows the template text beside the draft, every sentence tagged, and the template chosen", async () => {
    mount();
    await draftThisVersion();
    // each AI card carries the label, and every sentence carries its own once the card is chosen
    expect(screen.getAllByText("AI-DRAFTED")).toHaveLength(sent.length);
    expect(templateCards()).toHaveLength(sent.length);
    for (const card of templateCards()) expect(card).toHaveAttribute("aria-pressed", "true");
    for (const card of aiCards()) expect(card).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Template chosen by default")).toBeInTheDocument();
    expect(screen.getByLabelText("Document for developers")).not.toHaveTextContent("sole layer");
  });

  it("tags every sentence of a chosen AI card for editing", async () => {
    mount();
    await draftThisVersion();
    fireEvent.click(aiCards()[1]);
    const action = sent.find((b) => b.blockId === "action");
    expect(screen.getAllByText("AI-drafted")).toHaveLength(action?.lines.length ?? 0);
  });

  it("copies the template text unless a draft is chosen", async () => {
    mount();
    await draftThisVersion();
    const text = await copyAs("Sam Lee");
    expect(text).not.toContain("drafted by a language model");
    expect(text).not.toContain("(AI-drafted");
  });

  it("copies a chosen draft with one attribution line for it and one line at the top", async () => {
    mount();
    await draftThisVersion();
    fireEvent.click(aiCards()[1]);
    expect(screen.getByLabelText("Document for developers")).toHaveTextContent("sole layer");
    const text = await copyAs("Sam Lee");
    expect(text).toContain(
      "drafted by a language model and reviewed by Sam Lee: Needs developer action."
    );
    expect(text).toContain("sole layer");
    expect(text.split("(AI-drafted, reviewed by Sam Lee)")).toHaveLength(2);
    expect(text).toContain("Not covered by this check");
  });

  it("saves the drafts in the file keyed by reader, block and model, with the hash they were made from", async () => {
    mount();
    await draftThisVersion();
    const cache = savedDrafts();
    expect(Object.keys(cache).sort()).toEqual([
      "developer|action|text-model:test",
      "developer|summary|text-model:test"
    ]);
    for (const entry of Object.values(cache)) expect(entry.structureHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("prepares every reader's version, one block per call", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Prepare all versions" }));
    await screen.findByText(/Drafts are ready to look at/);
    expect(new Set(sent.map((b) => b.audience))).toEqual(
      new Set(["developer", "pm", "higherUp", "client"])
    );
    expect(Object.keys(savedDrafts()).length).toBe(sent.length);
  });
});

describe("edits", () => {
  async function chooseDraft() {
    mount();
    await draftThisVersion();
    fireEvent.click(aiCards()[1]);
    return screen.getByLabelText("Needs developer action, sentence 1") as HTMLTextAreaElement;
  }

  it("tags an edited sentence and keeps a harmless edit", async () => {
    const field = await chooseDraft();
    fireEvent.change(field, { target: { value: field.value.replace("need", "require") } });
    expect(field.value).toContain("require");
    expect(screen.getByText("AI-drafted, edited")).toBeInTheDocument();
  });

  it("does not keep a number, and says so", async () => {
    const field = await chooseDraft();
    const before = field.value;
    fireEvent.change(field, { target: { value: before + " 7 times" } });
    expect(screen.getByRole("alert")).toHaveTextContent("That change was not kept");
    expect(field.value).toBe(before);
    expect(screen.queryByText("AI-drafted, edited")).toBeNull();
  });

  it("keeps an edit that only warns, and the warning goes to the review gate", async () => {
    const field = await chooseDraft();
    fireEvent.change(field, { target: { value: field.value + ' See "Pay now".' } });
    expect(screen.getByLabelText("Things to look at in Needs developer action")).toHaveTextContent(
      "Pay now"
    );
    const gate = screen.getByRole("dialog");
    expect(
      within(gate).getByLabelText("Things to look at in the AI-drafted text")
    ).toHaveTextContent("Needs developer action: Quoted text that is not an id: Pay now");
    expect(within(gate).getByText("AI text chosen for 1 block")).toBeInTheDocument();
  });

  it("shows plain-word labels in the draft for a reader who is not a developer", async () => {
    mount();
    fireEvent.click(screen.getByLabelText("Client"));
    fireEvent.click(screen.getByRole("button", { name: "Draft this version" }));
    await screen.findByText(/Drafts are ready to look at/);
    fireEvent.click(aiCards()[0]);
    const field = screen.getByLabelText("Summary, sentence 1") as HTMLTextAreaElement;
    expect(field.value.startsWith("Measured:")).toBe(true);
    fireEvent.change(field, { target: { value: field.value.replace("need", "require") } });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("when drafting does not work", () => {
  it("keeps the template and says in one plain line that the helper is not running", async () => {
    stubServer(() => new TypeError("Failed to fetch"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Draft this version" }));
    expect(
      await screen.findByText("The drafting helper is not running, so the template text stays.")
    ).toBeInTheDocument();
    for (const card of aiCards()) expect(card).toBeDisabled();
    expect(posted.some((m) => m.type === "HANDOFF_DRAFTS_SET")).toBe(false);
    const text = await copyAs("Sam");
    expect(text).not.toContain("drafted by a language model");
    expect(text).toContain("Needs developer action");
  });

  it("says why for a block the server could not draft, and offers only the template", async () => {
    stubServer((b) => ({
      sentences: [],
      reason: "not-configured",
      model: null,
      ms: 0,
      blockId: b.blockId
    }));
    mount();
    await draftThisVersion();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "No drafting model is set up on this computer"
    );
    for (const card of aiCards()) expect(card).toBeDisabled();
  });

  it("does not offer a draft that fails the checks", async () => {
    stubServer((b) => ({
      sentences: b.lines.map((l) => `${l} All 12 are fine.`),
      reason: "ok",
      model: "m",
      ms: 1,
      blockId: b.blockId
    }));
    mount();
    await draftThisVersion();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("did not pass the checks");
    for (const card of aiCards()) expect(card).toBeDisabled();
    expect(posted.some((m) => m.type === "HANDOFF_DRAFTS_SET")).toBe(false);
  });
});

describe("saved drafts", () => {
  async function liveRun() {
    mount();
    await draftThisVersion();
    fireEvent.click(aiCards()[1]);
    const tags = screen.getAllByText(/AI-drafted/).map((el) => el.textContent);
    const text = await copyAs("Sam Lee");
    const drafts = savedDrafts();
    cleanup();
    return { tags, text, drafts };
  }

  it("a saved draft looks and copies exactly like a live one, with no call to the server", async () => {
    const live = await liveRun();
    stubServer();
    mount(live.drafts);
    expect(sent).toEqual([]);
    expect(screen.queryByText("Draft is from earlier findings")).toBeNull();
    fireEvent.click(aiCards()[1]);
    const tags = screen.getAllByText(/AI-drafted/).map((el) => el.textContent);
    expect(tags).toEqual(live.tags);
    expect(await copyAs("Sam Lee")).toBe(live.text);
    expect(sent).toEqual([]);
  });

  it("a draft made from earlier findings is shown as that and is not offered", async () => {
    const { drafts } = await liveRun();
    const stale = Object.fromEntries(
      Object.entries(drafts).map(([k, e]) => [k, { ...e, structureHash: "00000000" }])
    );
    stubServer();
    mount(stale);
    expect(screen.getAllByText("Draft is from earlier findings").length).toBe(2);
    for (const card of aiCards()) expect(card).toBeDisabled();
    expect(screen.queryAllByText("AI-drafted")).toEqual([]);
    expect(await copyAs("Sam")).not.toContain("drafted by a language model");
  });

  it("a saved draft that no longer passes the checks is left out", async () => {
    const { drafts } = await liveRun();
    const broken = Object.fromEntries(
      Object.entries(drafts).map(([k, e]) => [
        k,
        { ...e, sentences: e.sentences.map((s) => s + " It is compliant.") }
      ])
    );
    mount(broken);
    for (const card of aiCards()) expect(card).toBeDisabled();
    expect(screen.getAllByText(/did not pass the checks/).length).toBe(2);
  });
});
