import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tools/**/*.test.ts"],
    passWithNoTests: true,
    // Module css is applied with plain class names so tests can assert on computed style
    css: { include: [/\.module\.css$/], modules: { classNameStrategy: "non-scoped" } }
  }
});
