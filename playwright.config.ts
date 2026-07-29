import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Reuse a Chromium that is already present in the environment (CI sandboxes often
 * ship one at a different revision than the npm package expects).
 */
function findChromium(): string | undefined {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH || "/", `${process.env.HOME}/.cache/ms-playwright`];
  for (const root of roots) {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const dir of entries.filter((d) => d.startsWith("chromium"))) {
      for (const rel of [
        "chrome-linux/chrome",
        "chrome-headless-shell-linux64/chrome-headless-shell",
      ]) {
        const candidate = path.join(root, dir, rel);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return undefined;
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 1280, height: 1800 },
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: { executablePath: findChromium() },
  },
});