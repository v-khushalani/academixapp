import { test, expect } from "@playwright/test";
import { login, collectPageIssues } from "./helpers";

test.describe("Go-Live Smoke Tests & Health Checks", () => {
  test("Role Permissions: Student cannot access Admin areas", async ({ page }) => {
    const issues = collectPageIssues(page);
    await login(page, "student");
    
    const adminPaths = ["/app", "/app/settings", "/app/fees"];
    for (const path of adminPaths) {
      await page.goto(path);
      // Wait for any potential redirect
      await page.waitForTimeout(1000);
      const url = page.url();
      expect(url).not.toContain(path); 
    }
  });

  test("Core Pages Load: High-traffic routes", async ({ page }) => {
    await login(page, "admin");
    const criticalPaths = [
      "/app",
      "/app/admissions",
      "/app/attendance",
      "/app/fees",
      "/app/reports"
    ];
    
    for (const path of criticalPaths) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.locator("main").first()).toBeVisible();
    }
  });
});
