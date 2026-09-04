# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> admin portal >> Fees KPIs are internally consistent and survive the status filter
- Location: tests/e2e/admin.spec.ts:50:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - link "Ax Academix" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [ref=e6]: Ax
        - generic [ref=e8]: Academix
      - heading "Sign in" [level=1] [ref=e9]
      - paragraph [ref=e10]: One login for everyone — office, teachers, students and parents. We take you to the right dashboard automatically.
      - generic [ref=e11]:
        - button "Continue with Google" [ref=e12] [cursor=pointer]
        - generic [ref=e13]: or
      - generic [ref=e17]:
        - generic [ref=e18]:
          - text: Login ID
          - textbox "Login ID" [ref=e19]:
            - /placeholder: you@institute.in
            - text: admin.alpha@academix.com
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Password
            - link "Forgot?" [ref=e23] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "Password" [ref=e24]: test@123
        - button "Sign in" [ref=e25] [cursor=pointer]
      - generic [ref=e26]:
        - paragraph [ref=e27]:
          - text: Running an institute and new here?
          - link "Create your institute" [ref=e28] [cursor=pointer]:
            - /url: /signup
        - paragraph [ref=e29]: Teachers, students and parents don't sign up — your institute sends the login link.
        - paragraph [ref=e30]:
          - link "← Back to Academix" [ref=e31] [cursor=pointer]:
            - /url: /
    - generic [ref=e33]:
      - paragraph [ref=e34]: Academix · Institute OS
      - heading "One dashboard for the entire institute." [level=2] [ref=e35]
      - paragraph [ref=e36]: Admissions, attendance, fees, tests and timetable — plus the teacher and family portals, all from this one sign-in.
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { expect, type Page } from "@playwright/test";
  2  | 
  3  | export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "test@123";
  4  | export const DEMO = {
  5  |   admin: { email: "admin.alpha@academix.com", loginPath: "/login", home: "/app" },
  6  |   proAdmin: { email: "admin.beta@academix.com", loginPath: "/login", home: "/app" },
  7  |   teacher: { email: "teacher1.alpha@academix.com", loginPath: "/login", home: "/teach" },
  8  |   student: { email: "student1.alpha@academix.com", loginPath: "/login", home: "/portal" },
  9  | } as const;
  10 | 
  11 | export async function login(page: Page, who: keyof typeof DEMO) {
  12 |   const cfg = DEMO[who];
  13 |   await page.goto(cfg.loginPath, { waitUntil: "networkidle" });
  14 |   // Wait for hydration: before it, the form submits natively and never signs in.
  15 |   await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  16 |   await page.waitForTimeout(1500);
  17 |   await page.locator("#email").fill(cfg.email);
  18 |   await page.locator("#password").fill(DEMO_PASSWORD);
  19 |   await page.getByRole("button", { name: /sign in/i }).click();
> 20 |   await page.waitForURL((u) => u.pathname.startsWith(cfg.home), { timeout: 30_000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 30000ms exceeded.
  21 | }
  22 | 
  23 | /** Reads the numeric value shown on a KpiCard by its label. */
  24 | export async function kpi(page: Page, label: string): Promise<number> {
  25 |   const value = page
  26 |     .locator("p", { hasText: new RegExp(`^${label}$`, "i") })
  27 |     .first()
  28 |     .locator("xpath=following-sibling::p[1]");
  29 |   await expect(value).toBeVisible();
  30 |   return toNumber((await value.innerText()).trim());
  31 | }
  32 | 
  33 | export function toNumber(text: string): number {
  34 |   const cleaned = text.replace(/[^0-9.-]/g, "");
  35 |   return cleaned === "" ? 0 : Number(cleaned);
  36 | }
  37 | 
  38 | /** Sum of one column of the desktop data table (values may be currency strings). */
  39 | export async function sumColumn(page: Page, headerLabel: string): Promise<number> {
  40 |   const headers = await page.locator("table thead th").allInnerTexts();
  41 |   const idx = headers.findIndex((h) => h.trim().toLowerCase().startsWith(headerLabel.toLowerCase()));
  42 |   expect(idx, `column "${headerLabel}" not found in [${headers.join(", ")}]`).toBeGreaterThan(-1);
  43 |   const cells = await page.locator(`table tbody tr td:nth-child(${idx + 1})`).allInnerTexts();
  44 |   return cells.reduce((a, c) => a + toNumber(c), 0);
  45 | }
  46 | 
  47 | export async function rowCount(page: Page): Promise<number> {
  48 |   return page.locator("table tbody tr").count();
  49 | }
  50 | 
  51 | /** "1–3 of 3" / "3 of 3 students" style counters -> total. */
  52 | export async function totalFromCounter(page: Page, re: RegExp): Promise<number> {
  53 |   const text = await page.locator("body").innerText();
  54 |   const m = text.match(re);
  55 |   expect(m, `counter ${re} not found`).not.toBeNull();
  56 |   return toNumber(m![1]);
  57 | }
  58 | 
  59 | export function collectPageIssues(page: Page) {
  60 |   const issues: string[] = [];
  61 |   page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
  62 |   page.on("console", (m) => {
  63 |     if (m.type() === "error") issues.push(`console: ${m.text()}`);
  64 |   });
  65 |   page.on("response", (r) => {
  66 |     if (r.status() >= 400) issues.push(`http ${r.status()}: ${r.url()}`);
  67 |   });
  68 |   return issues;
  69 | }
```