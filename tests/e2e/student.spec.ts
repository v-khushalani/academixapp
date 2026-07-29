import { test, expect } from "@playwright/test";
import { collectPageIssues, kpi, login } from "./helpers";

const PAGES = [
  "/portal",
  "/portal/attendance",
  "/portal/progress",
  "/portal/fees",
  "/portal/timetable",
  "/portal/homework",
];

test.describe("student & parent portal", () => {
  test("every portal screen loads cleanly", async ({ page }) => {
    const issues = collectPageIssues(page);
    await login(page, "student");
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(page.url()).toContain(path);
    }
    expect(issues, issues.join("\n")).toEqual([]);
  });

  test("home fee KPI matches the Fees screen", async ({ page }) => {
    await login(page, "student");
    await page.goto("/portal", { waitUntil: "networkidle" });
    const homeDue = await kpi(page, "Fees due");

    await page.goto("/portal/fees", { waitUntil: "networkidle" });
    const billed = await kpi(page, "Billed");
    const paid = await kpi(page, "Paid");
    const due = await kpi(page, "Due");

    expect(homeDue, "home 'Fees due' vs Fees page 'Due'").toBe(due);
    expect(billed - paid, "billed - paid vs due").toBe(due);
  });

  test("attendance percentage matches present/absent counts", async ({ page }) => {
    await login(page, "student");
    await page.goto("/portal/attendance", { waitUntil: "networkidle" });
    const overall = await kpi(page, "Overall");
    const present = await kpi(page, "Present");
    const absent = await kpi(page, "Absent");
    const late = await kpi(page, "Late");
    const marked = present + absent + late;
    const expected = marked === 0 ? 0 : Math.round(((present + late) / marked) * 100);
    expect(Math.abs(overall - expected), "attendance % vs raw counts").toBeLessThanOrEqual(1);
  });

  test("portal header shows the real institute name", async ({ page }) => {
    await login(page, "student");
    await page.goto("/portal", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("Your Institute");
  });
});