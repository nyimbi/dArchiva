// (c) Copyright Datacraft, 2026
/**
 * Authentication E2E tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
	test('should show login page when not authenticated', async ({ page }) => {
		await page.goto('/');

		// Should redirect to login
		await expect(page).toHaveURL(/.*login/);

		// Login form should be visible
		await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
		await expect(page.getByLabel(/username/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
	});

	test('should require username and password', async ({ page }) => {
		await page.goto('/login');

		// Click login without filling form — native required validation blocks submit.
		await page.getByRole('button', { name: /sign in/i }).click();

		const usernameMissing = await page
			.getByLabel(/username/i)
			.evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
		expect(usernameMissing).toBe(true);
	});

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel(/username/i).fill('invaliduser');
		await page.getByLabel(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Error message should be shown (exact wording depends on backend response).
		await expect(page.getByText(/invalid|incorrect|failed|unauthorized/i)).toBeVisible();
	});
});
