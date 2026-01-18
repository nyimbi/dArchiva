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
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
	});

	test('should show validation errors for empty form', async ({ page }) => {
		await page.goto('/login');

		// Click login without filling form
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should show validation errors
		await expect(page.getByText(/email is required/i)).toBeVisible();
		await expect(page.getByText(/password is required/i)).toBeVisible();
	});

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel(/email/i).fill('invalid@test.com');
		await page.getByLabel(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should show error message
		await expect(page.getByText(/invalid credentials/i)).toBeVisible();
	});
});
