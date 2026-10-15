import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { FACT_LIBRARY } from "../../../shared/teachMeWhy/facts";
import { sourceNamesFor } from "../../../shared/teachMeWhy/sourceNames";
import type { ExplanationView } from "../../../shared/teachMeWhy/explanationView";
import { ExplanationCard } from "./ExplanationCard";

afterEach(cleanup);

function viewUsing(factIds: string[]): ExplanationView {
  return {
    key: { role: "unknown", severity: "high", size: "normal", depth: 3 },
    entry: { text: "Words.", status: "approved", reviewer: "DG", factIds },
    isAi: true,
    text: "Words.",
    basedOn: sourceNamesFor(factIds),
    measured: "2.21:1",
    required: "4.5:1"
  };
}

describe("the Based on line", () => {
  it("renders every source in full, the long ones included, for every fact", () => {
    for (const fact of FACT_LIBRARY) {
      cleanup();
      render(
        <ExplanationCard
          view={viewUsing([fact.id])}
          hidden={false}
          onHide={() => undefined}
          onShowAgain={() => undefined}
        />
      );
      expect(screen.getByText(`Based on: ${fact.source}`)).toBeInTheDocument();
    }
  });

  it("separates several sources with a semicolon so a comma inside a name is not read as a break", () => {
    render(
      <ExplanationCard
        view={viewUsing(["F01", "F16"])}
        hidden={false}
        onHide={() => undefined}
        onShowAgain={() => undefined}
      />
    );
    const line = screen.getByText(/^Based on:/).textContent ?? "";
    expect(line).toBe(
      "Based on: World Wide Web Consortium (W3C), Contrast (Minimum); " +
        "Tigwell, Improving Content Design on Mobile Devices to Reduce Situational Visual Impairments (PhD thesis, 2019)"
    );
  });

  it("is styled so nothing is truncated and a long name wraps", () => {
    const css = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "ExplanationCard.module.css"),
      "utf8"
    );
    for (const cutting of [
      /text-overflow/,
      /white-space:\s*nowrap/,
      /overflow:\s*hidden/,
      /line-clamp/,
      /max-height/
    ]) {
      expect(css).not.toMatch(cutting);
    }
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
  });
});
