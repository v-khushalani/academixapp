import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "test@123";
export const DEMO = {
  admin: { email: "admin.alpha@academix.com", loginPath: "/login", home: "/app" },
  proAdmin: { email: "admin.beta@academix.com", loginPath: "/login", home: "/app" },
  teacher: { email: "teacher1.alpha@academix.com", loginPath: "/login", home: "/teach" },
  student: { email: "student1.alpha@academix.com", loginPath: "/login", home: "/portal" },
} as const;

export async function login(page: Page, who: keyof typeof DEMO) {
  const cfg = DEMO[who];
  await page.goto(cfg.loginPath, { waitUntil: "networkidle" });
  // Wait for hydration: before it, the form submits natively and never signs in.
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  await page.waitForTimeout(1500);
  await page.locator("#email").fill(cfg.email);
  await page.locator("#password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => u.pathname.startsWith(cfg.home), { timeout: 30_000 });
}

/** Reads the numeric value shown on a KpiCard by its label. */
export async function kpi(page: Page, label: string): Promise<number> {
  const value = page
    .locator("p", { hasText: new RegExp(`^${label}$`, "i") })
    .first()
    .locator("xpath=following-sibling::p[1]");
  await expect(value).toBeVisible();
  return toNumber((await value.innerText()).trim());
}

export function toNumber(text: string): number {
  const cleaned = text.replace(/[^0-9.-]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

/** Sum of one column of the desktop data table (values may be currency strings). */
export async function sumColumn(page: Page, headerLabel: string): Promise<number> {
  const headers = await page.locator("table thead th").allInnerTexts();
  const idx = headers.findIndex((h) => h.trim().toLowerCase().startsWith(headerLabel.toLowerCase()));
  expect(idx, `column "${headerLabel}" not found in [${headers.join(", ")}]`).toBeGreaterThan(-1);
  const cells = await page.locator(`table tbody tr td:nth-child(${idx + 1})`).allInnerTexts();
  return cells.reduce((a, c) => a + toNumber(c), 0);
}

export async function rowCount(page: Page): Promise<number> {
  return page.locator("table tbody tr").count();
}

/** "1–3 of 3" / "3 of 3 students" style counters -> total. */
export async function totalFromCounter(page: Page, re: RegExp): Promise<number> {
  const text = await page.locator("body").innerText();
  const m = text.match(re);
  expect(m, `counter ${re} not found`).not.toBeNull();
  return toNumber(m![1]);
}

export function collectPageIssues(page: Page) {
  const issues: string[] = [];
  page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") issues.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) issues.push(`http ${r.status()}: ${r.url()}`);
  });
  return issues;
}