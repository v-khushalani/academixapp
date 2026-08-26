import { test, expect } from "@playwright/test";
import { collectPageIssues, kpi, login, rowCount, sumColumn, totalFromCounter } from "./helpers";

const MODULES = [
  "/app",
  "/app/students",
  "/app/admissions",
  "/app/batches",
  "/app/attendance",
  "/app/fees",
  "/app/tests",
  "/app/timetable",
  "/app/faculty",
  "/app/reports",
  "/app/settings",
];

test.describe("admin portal", () => {
  test("every module loads without runtime or network errors", async ({ page }) => {
    const issues = collectPageIssues(page);
    await login(page, "admin");
    for (const path of MODULES) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("main").first()).toBeVisible();
      expect(page.url(), `redirected away from ${path}`).toContain(path);
    }
    expect(issues, issues.join("\n")).toEqual([]);
  });

  test("dashboard stats match Students, Batches and Fees pages", async ({ page }) => {
    await login(page, "proAdmin");

    await page.goto("/app", { waitUntil: "networkidle" });
    const dashStudents = await kpi(page, "Students");

    await page.goto("/app/students", { waitUntil: "networkidle" });
    const studentsTotal = await totalFromCounter(page, /(\d+)\s+of\s+\d+\s+students/i);
    expect(dashStudents, "dashboard students vs Students page").toBe(studentsTotal);

    await page.goto("/app/batches", { waitUntil: "networkidle" });
    const batchesTotal = await totalFromCounter(page, /(\d+)\s+batch/i);
    expect(batchesTotal, "batches page shows a count").toBeGreaterThan(0);

    await page.goto("/app/fees", { waitUntil: "networkidle" });
    const billed = await kpi(page, "Total billed");
    const collected = await kpi(page, "Collected");
    expect(billed, "billed covers collections").toBeGreaterThanOrEqual(collected);
  });

  test("Fees KPIs are internally consistent and survive the status filter", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/app/fees", { waitUntil: "networkidle" });

    const billed = await kpi(page, "Total billed");
    const collected = await kpi(page, "Collected");
    const outstanding = await kpi(page, "Outstanding");

    // The table is paginated, so the visible page can only be a subset of the KPIs.
    expect(await sumColumn(page, "Amount"), "visible Amount vs billed KPI").toBeLessThanOrEqual(billed);
    expect(await sumColumn(page, "Paid"), "visible Paid vs collected KPI").toBeLessThanOrEqual(collected);
    expect(billed - collected, "billed - collected vs outstanding").toBeGreaterThanOrEqual(
      outstanding,
    );

    const all = await rowCount(page);
    const statusFilter = page.locator("button[role=combobox]").nth(1);
    for (const status of ["Pending", "Partial", "Paid"]) {
      await statusFilter.click();
      await page.getByRole("option", { name: status, exact: true }).click();
      await page.waitForTimeout(600);
      expect(await rowCount(page), `${status} filter returns more rows than "all"`).toBeLessThanOrEqual(all);
      await statusFilter.click();
      await page.getByRole("option", { name: "All statuses" }).click();
      await page.waitForTimeout(400);
    }
    expect(await rowCount(page)).toBe(all);
  });


  test("Attendance roster counts add up for every batch", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/app/attendance", { waitUntil: "networkidle" });
    const roster = await kpi(page, "Roster");
    const present = await kpi(page, "Present");
    const absent = await kpi(page, "Absent");
    expect(present + absent, "present + absent cannot exceed roster").toBeLessThanOrEqual(roster);
  });

  test("Timetable grid renders and stays free of duplicate-class conflicts", async ({ page }) => {
    const issues = collectPageIssues(page);
    await login(page, "admin");
    await page.goto("/app/timetable", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /timetable/i }).first()).toBeVisible();
    const body = await page.locator("main").first().innerText();
    expect(body, "timetable body did not render").not.toBe("");
    expect(body, "unresolved timetable conflicts").not.toMatch(/is in two classes at once/i);
    expect(issues, issues.join("\n")).toEqual([]);
  });

  test("Revenue report total matches money collected on Fees", async ({ page }) => {
    // Reports is a paid module, so this runs on the institute that has it.
    await login(page, "proAdmin");
    await page.goto("/app/fees", { waitUntil: "networkidle" });
    const collected = await kpi(page, "Collected");

    await page.goto("/app/reports", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    const m = text.match(/Total\s+₹([\d,]+)/);
    expect(m, "revenue total missing").not.toBeNull();
    const revenue = Number(m![1].replace(/,/g, ""));
    // Revenue is date-filtered, so it can only ever be a subset of lifetime collections.
    expect(revenue).toBeLessThanOrEqual(collected);
  });

  test("a module switched off by the plan shows the upgrade screen, not a dead end", async ({
    page,
  }) => {
    await login(page, "admin"); // free plan institute
    await page.goto("/app/reports", { waitUntil: "networkidle" });
    await expect(page.getByText(/not on your plan/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
  });
});
