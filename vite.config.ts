import { execSync } from "node:child_process";
import path from "node:path";

import { build } from "esbuild";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/** The commit and time the bundle came from, so a debug report can say which build ran */
function buildInfo() {
  const git = (args: string): string | null => {
    try {
      return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      return null;
    }
  };
  const status = git("status --porcelain");
  return {
    commit: git("rev-parse --short HEAD") ?? "unknown",
    dirty: status === null ? null : status !== "",
    builtAt: new Date().toISOString(),
    studyBuild: STUDY_BUILD
  };
}

/** True unless the env var STUDY_BUILD is 0, a demo build sets it to 0 to turn the study changes off */
const STUDY_BUILD = process.env.STUDY_BUILD !== "0";

function buildPluginSandbox(): Plugin {
  return {
    name: "build-plugin-sandbox",
    async closeBundle() {
      await build({
        bundle: true,
        entryPoints: [path.resolve("src/plugin/main.ts")],
        define: {
          __CADT_BUILD__: JSON.stringify(buildInfo()),
          __STUDY_BUILD__: JSON.stringify(STUDY_BUILD)
        },
        format: "iife",
        outfile: path.resolve("dist/code.js"),
        platform: "browser",
        target: "es2022"
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), buildPluginSandbox()],
  define: { __STUDY_BUILD__: JSON.stringify(STUDY_BUILD) },
  build: {
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    outDir: "dist",
    rollupOptions: {
      input: path.resolve("ui.html"),
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
