import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Full E2E Flow: Admission to Attendance", () => {
  test("Complete student lifecycle: Lead -> Admission -> Batch -> Attendance", async ({ page }) => {
    await login(page, "admin");

    // 1. Create a Lead/Enquiry
    await page.goto("/app/admissions");
    await page.getByRole("button", { name: /new enquiry/i }).click();
    await page.locator("input[name='full_name']").fill("E2E Test Student");
    await page.locator("input[name='phone']").fill("9876543210");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("E2E Test Student")).toBeVisible();

    // 2. Approve Admission
    await page.getByRole("button", { name: /approve/i }).first().click();
    // Wait for the admission modal/form
    await page.locator("select[name='batch_id']").selectOption({ index: 1 });
    await page.getByRole("button", { name: /confirm admission/i }).click();

    // 3. Verify in Students List
    await page.goto("/app/students");
    await expect(page.getByText("E2E Test Student")).toBeVisible();

    // 4. Mark Attendance
    await page.goto("/app/attendance");
    // Pick the first batch
    await page.locator(".batch-card").first().click();
    // Mark our student as present
    await page.locator("tr", { hasText: "E2E Test Student" }).getByRole("checkbox").check();
    await page.getByRole("button", { name: /save attendance/i }).click();
    await expect(page.getByText(/attendance marked/i)).toBeVisible();
  });
});
