import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config } from "./types";

export const TOOL_DIR = dirname(fileURLToPath(import.meta.url));

/** Reads the git ignored .env beside this file if it is there, real environment values win */
export function loadEnvFile(): void {
  const path = join(TOOL_DIR, ".env");
  if (existsSync(path)) process.loadEnvFile(path);
}

/** Configuration comes only from the environment, the key is never printed */
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ["GENAI_BASE_URL", "GENAI_API_KEY", "GENAI_MODEL"].filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Set these environment variables first: ${missing.join(", ")}`);
  }
  return {
    baseUrl: env.GENAI_BASE_URL ?? "",
    apiKey: env.GENAI_API_KEY ?? "",
    model: env.GENAI_MODEL ?? ""
  };
}
