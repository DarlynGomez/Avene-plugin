import { describe, expect, it } from "vitest";

import { finding, ignoredFinding, input } from "./handoffFixtures";
import { buildTickets, MAX_CRITERIA, renderTicket, TICKET_LINK_CAP } from "./ticket";

const link = (id: string) => `https://www.figma.com/design/KEY/Checkout?node-id=${id}`;

function roots(count: number) {
  return Array.from({ length: count }, (_, i) =>
    finding({
      issueId: `a${i}`,
      nodeId: `9:${i}`,
      nodeName: `Text ${i}`,
      foregroundHex: `#${String(i + 10).padStart(2, "0")}${String(i + 10).padStart(2, "0")}${String(i + 10).padStart(2, "0")}`,
      link: link(`9-${i}`)
    })
  );
}

const criteria = (lines: string[]) => lines.filter((l) => l.startsWith("- [ ]"));

describe("buildTickets", () => {
  it("builds one ticket per screen with a criterion per root plus the keyboard pass", () => {
    const [ticket] = buildTickets(
      input({ findings: roots(3), fileUrl: "https://www.figma.com/design/KEY/Checkout" })
    );
    expect(ticket.title).toBe("[A11y] Payment: text contrast, 3 layers");
    expect(criteria(ticket.lines)).toHaveLength(4);
    expect(ticket.lines[1]).toBe(
      "Impact: People with low vision, or reading in bright light, may not be able to read this text."
    );
    expect(ticket.lines[2]).toBe(
      `Design: ${link("9-0")}   Handoff: https://www.figma.com/design/KEY/Checkout`
    );
    expect(ticket.lines).toContain("Layers");
    expect(ticket.lines.filter((l) => l.startsWith("- Text "))).toHaveLength(3);
  });

  it("splits by root so no ticket passes the criteria convention", () => {
    const tickets = buildTickets(input({ findings: roots(MAX_CRITERIA) }));
    expect(tickets).toHaveLength(2);
    expect(tickets.map((t) => criteria(t.lines).length)).toEqual([MAX_CRITERIA, 2]);
    expect(tickets[0].title).toContain("(part 1 of 2)");
    expect(tickets[1].title).toContain("(part 2 of 2)");
  });

  it("caps the layer links and says how many more", () => {
    const many = Array.from({ length: TICKET_LINK_CAP + 3 }, (_, i) =>
      finding({ issueId: `m${i}`, nodeId: `5:${i}`, nodeName: `Row ${i}`, link: link(`5-${i}`) })
    );
    const [ticket] = buildTickets(input({ findings: many }));
    const layerLines = ticket.lines.filter((l) => l.startsWith("- Row"));
    expect(layerLines).toHaveLength(TICKET_LINK_CAP);
    expect(ticket.lines).toContain("- and 3 more layers");
  });

  it("omits link lines with no addresses and the known exception with nothing left", () => {
    const [ticket] = buildTickets(input({ findings: [finding()] }));
    expect(ticket.lines.some((l) => l.startsWith("Design:"))).toBe(false);
    expect(ticket.lines).not.toContain("Layers");
    expect(ticket.lines.some((l) => l.startsWith("Known exception"))).toBe(false);
  });

  it("notes the items left as-is on the screen and ignores other screens", () => {
    const tickets = buildTickets(
      input({
        findings: [
          finding(),
          ignoredFinding(),
          finding({ issueId: "o", screenId: "s2", screenName: "Cart", foregroundHex: "#010101" })
        ],
        screens: [{ id: "s1", name: "Payment" }]
      })
    );
    expect(tickets).toHaveLength(1);
    expect(tickets[0].lines.at(-1)).toBe(
      "Known exception: 1 item knowingly left as-is, see the handoff document."
    );
  });

  it("makes no ticket for a screen with nothing to do, and renders to plain text", () => {
    expect(buildTickets(input({ findings: [ignoredFinding()] }))).toEqual([]);
    const [ticket] = buildTickets(input({ findings: [finding()] }));
    expect(renderTicket(ticket).split("\n")).toEqual(ticket.lines);
    expect(renderTicket(ticket)).not.toMatch(/[—–]/);
  });
});
