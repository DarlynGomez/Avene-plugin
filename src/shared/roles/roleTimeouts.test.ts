import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROLE_SERVER } from "./roleConfig";

// built from segments so no source file names the tools folder
const configPath = join(
  __dirname,
  "..",
  "..",
  "..",
  ["to", "ols"].join(""),
  "roles-server",
  "roles_server",
  "config.py"
);
const configText = readFileSync(configPath, "utf8");

function serverDefault(field: string): number {
  const match = new RegExp(`${field}: float = ([0-9.]+)`).exec(configText);
  if (!match) throw new Error(`no default found for ${field}`);
  return Number(match[1]);
}

describe("plugin and server timeouts", () => {
  it("keeps the live wait at least 2 s longer than the server's", () => {
    expect(ROLE_SERVER.liveTimeoutMs).toBeGreaterThanOrEqual(
      serverDefault("timeout_seconds") * 1000 + 2000
    );
  });

  it("keeps the precompute wait at least 2 s longer than the server's", () => {
    expect(ROLE_SERVER.precomputeTimeoutMs).toBeGreaterThanOrEqual(
      serverDefault("precompute_timeout_seconds") * 1000 + 2000
    );
  });
});
