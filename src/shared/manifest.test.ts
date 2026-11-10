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
  it("allows only YouTube media domains and the role server in development", () => {
    expect(manifest.networkAccess.allowedDomains).toEqual([
      "https://www.youtube-nocookie.com",
      "https://www.youtube.com",
      "https://*.youtube.com",
      "https://*.ytimg.com",
      "https://*.googlevideo.com"
    ]);
    expect(manifest.networkAccess.devAllowedDomains).toEqual(["http://localhost:8750"]);
  });
  it("uses a name and not an address, Figma refuses an IP address here", () => {
    for (const entry of manifest.networkAccess.devAllowedDomains ?? []) {
      expect(entry).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    }
  });
  it("says why, in the reasoning text", () => {
    expect(manifest.networkAccess.reasoning).toMatch(/YouTube media domains/);
    expect(manifest.networkAccess.reasoning).toMatch(/active study sessions/);
    expect(manifest.networkAccess.reasoning).toMatch(/role suggestion server/);
    expect(manifest.networkAccess.reasoning).toMatch(/RIT/);
  });
  it("has the debug command that reports why detection finds nothing", () => {
    expect(manifest.menu.map((item) => item.command)).toContain("detection-check");
  });
  it("has the researcher command that precomputes roles", () => {
    expect(manifest.menu.map((item) => item.command)).toContain("precompute-roles");
  });

  it("is named Avene, in the plugin list and on the menu, and no longer CADT", () => {
    const named = manifest as unknown as {
      name: string;
      menu: { command?: string; name?: string }[];
    };
    expect(named.name).toBe("Avene");
    expect(named.menu.find((item) => item.command === "open")?.name).toBe("Open Avene");
    expect(JSON.stringify(manifest)).not.toContain("CADT");
  });
});
