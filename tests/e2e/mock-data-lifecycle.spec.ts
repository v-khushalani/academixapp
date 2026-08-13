import { test, expect } from '@playwright/test';

test('admin can reset and refill mock data', async ({ page }) => {
  // 1. Login as admin
  await page.goto('http://localhost:8080/login/admin');
  await page.fill('#email', 'admin@example.com');
  await page.fill('#password', 'Test@1234');
  await page.click('button[type="submit"]');

  // Wait for dashboard or home
  await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });

  // 2. Find and click Reset (triggering the confirmation dialog)
  const resetButton = page.getByRole('button', { name: /reset/i });
  await expect(resetButton).toBeVisible();
  await resetButton.click();

  // 3. Confirm Reset
  const confirmButton = page.getByRole('button', { name: /yes, reset everything/i });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  // 4. Verify Progress Modal appears
  const modal = page.getByText(/mock data progress/i);
  await expect(modal).toBeVisible();

  // 5. Wait for success summary
  const summary = page.getByText(/mock data summary/i);
  await expect(summary).toBeVisible({ timeout: 60000 });

  // 6. Check for entity counts in summary
  await expect(page.getByText(/students/i)).toBeVisible();
  await expect(page.getByText(/batches/i)).toBeVisible();
});
