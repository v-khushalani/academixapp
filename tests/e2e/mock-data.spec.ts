import { test, expect } from '@playwright/test';
import { supabaseAdmin } from '../../src/integrations/supabase/client.server';

test.describe('Mock Data Management', () => {
  const TEST_USER_EMAIL = 'admin@vkacademy.com'; // This should exist based on previous messages
  const TEST_INSTITUTE_NAME = 'VK ACADEMY';

  test('Reset & Refill Mock Data flow', async ({ page }) => {
    // 1. Sign in as Admin
    await page.goto('http://localhost:8080/login/admin');
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.getByText(TEST_INSTITUTE_NAME)).toBeVisible();

    // 2. Find the Demo Data Button container (Reset and Fill buttons)
    const resetButton = page.getByRole('button', { name: /reset/i });
    const fillButton = page.getByRole('button', { name: /fill mock data/i });

    await expect(resetButton).toBeVisible();
    await expect(fillButton).toBeVisible();

    // 3. Trigger Reset
    await resetButton.click();
    const confirmButton = page.getByRole('button', { name: /yes, reset everything/i });
    await expect(confirmButton).toBeVisible();
    
    // Before clicking, let's setup a listener for the success toast
    const successToast = page.getByText(/demo data reset successfully/i);
    
    await confirmButton.click();

    // The current implementation of handleReset calls handleSeed automatically
    // Wait for the final summary dialog
    const summaryDialog = page.getByText(/mock data summary/i);
    await expect(summaryDialog).toBeVisible({ timeout: 60000 });

    // Verify entity counts are present and non-zero
    const entities = ['students', 'batches', 'courses', 'faculty', 'rooms', 'syllabus chapters'];
    for (const entity of entities) {
      const count = page.locator(`div:has-text("${entity}")`).locator('span.text-2xl');
      await expect(count).not.toHaveText('0');
    }

    await page.getByRole('button', { name: /continue/i }).click();
  });
});
