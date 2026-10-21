import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(HERE, "..", "..", "manifest.json"), "utf8")) as {
  networkAccess: { allowedDomains: string[]; devAllowedDomains?: string[]; reasoning?: string };
  menu: { command?: string }[];
};

describe("manifest network access", () => {
  it("keeps allowedDomains closed and opens only localhost on the server's port for development", () => {
    expect(manifest.networkAccess.allowedDomains).toEqual(["none"]);
    expect(manifest.networkAccess.devAllowedDomains).toEqual(["http://localhost:8750"]);
  });
  it("uses a name and not an address, Figma refuses an IP address here", () => {
    for (const entry of manifest.networkAccess.devAllowedDomains ?? []) {
      expect(entry).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    }
  });
  it("says why, in the reasoning text", () => {
    expect(manifest.networkAccess.reasoning).toMatch(/role suggestion server/);
    expect(manifest.networkAccess.reasoning).toMatch(/RIT/);
  });
  it("has the debug command that reports why detection finds nothing", () => {
    expect(manifest.menu.map((item) => item.command)).toContain("detection-check");
  });
  it("has the researcher command that precomputes roles", () => {
    expect(manifest.menu.map((item) => item.command)).toContain("precompute-roles");
  });
});
