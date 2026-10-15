import { describe, expect, it } from "vitest";
import { buildUserMessage } from "./prompt";
import { retryMessage } from "./retryMessage";
import { generateItem } from "./generateItem";

const key = { role: "unknown", severity: "high", size: "normal", depth: 1 } as const;
const words = (n: number) => Array.from({ length: n }, () => "w").join(" ");

describe("retryMessage", () => {
  it("says the word count and the minimum", () => {
    expect(retryMessage(key, { code: "too-short", detail: "19 words" })).toBe(
      "your last attempt had 19 words, the minimum is 25"
    );
  });
  it("quotes what was written for the fix wording", () => {
    expect(retryMessage(key, { code: "fix-wording", detail: "You could {fix}" })).toContain(
      '"You could {fix}"'
    );
  });
});

describe("generateItem retries", () => {
  it("appends the exact failure to the next attempt and ends in a pass", async () => {
    const seen: string[] = [];
    const replies = [
      `{measured} {required} ${words(10)}`,
      `{measured} {required} You could {fix} ${words(30)}`,
      `{measured} {required} change the text to {fix} ${words(30)}`
    ];
    const result = await generateItem(
      key,
      [],
      (request) => {
        seen.push(request.user);
        return Promise.resolve({
          content: JSON.stringify({ text: replies[seen.length - 1], fact_ids: [] }),
          finishReason: "stop",
          totalTokens: 10
        });
      },
      () => Promise.resolve(() => undefined)
    );
    expect(result.status).toBe("completed");
    expect(seen[0]).toBe(buildUserMessage(key, []));
    expect(seen[1]).toContain(
      "Your last attempt failed: your last attempt had 12 words, the minimum is 25"
    );
    expect(seen[2]).toContain('you wrote "');
    expect(seen[2]).toContain("{fix} is a colour");
  });
  it("starts a rerun with the messages the row failed with", async () => {
    let first = "";
    await generateItem(
      key,
      [],
      (request) => {
        first = first || request.user;
        return Promise.resolve({
          content: JSON.stringify({ text: "x", fact_ids: [] }),
          finishReason: "stop",
          totalTokens: 1
        });
      },
      () => Promise.resolve(() => undefined),
      ["you repeated depth 2's opening and main claim, start with a different subject"]
    );
    expect(first).toContain("Your last attempt failed: you repeated depth 2's opening");
  });
});
