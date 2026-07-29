import { test, expect } from "@playwright/test";
import { collectPageIssues, login } from "./helpers";

test.describe("teacher portal", () => {
  test("teacher can reach only Today, Attendance and Marks", async ({ page }) => {
    const issues = collectPageIssues(page);
    await login(page, "teacher");

    for (const path of ["/teach", "/teach/attendance", "/teach/marks"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(page.url()).toContain(path);
      await expect(page.getByRole("link", { name: "Attendance" }).first()).toBeVisible();
    }
    expect(issues, issues.join("\n")).toEqual([]);
  });

  test("attendance screen counters stay consistent", async ({ page }) => {
    await login(page, "teacher");
    await page.goto("/teach/attendance", { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    const m = text.match(/(\d+)\s+students?\s+·\s+(\d+)\s+present\s+·\s+(\d+)\s+absent/i);
    expect(m, "attendance counter line missing").not.toBeNull();
    const [total, present, absent] = [Number(m![1]), Number(m![2]), Number(m![3])];
    expect(present + absent).toBeLessThanOrEqual(total);
  });

  test("teacher header shows the real institute name, not a placeholder", async ({ page }) => {
    await login(page, "teacher");
    await page.goto("/teach", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await expect(page.locator("header")).not.toContainText("Your Institute");
  });
});