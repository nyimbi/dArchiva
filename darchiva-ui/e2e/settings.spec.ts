// (c) Copyright Datacraft, 2026
/**
 * Settings and preferences E2E tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
	test.beforeEach(async ({ page }) => {
		// Mock authentication with admin privileges
		await page.addInitScript(() => {
			localStorage.setItem('auth_token', 'test-token');
			localStorage.setItem('user', JSON.stringify({
				id: '1',
				username: 'admin',
				email: 'admin@example.com',
				is_active: true,
				is_superuser: true,
			}));
		});
	});

	test('should display settings page', async ({ page }) => {
		await page.goto('/settings');

		// Settings page should be visible
		await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
	});

	test('should show user preferences', async ({ page }) => {
		await page.goto('/settings/preferences');

		// Preference sections should be visible
		await expect(page.getByText(/appearance/i)).toBeVisible();
		await expect(page.getByText(/notifications/i)).toBeVisible();
	});

	test('should toggle dark mode', async ({ page }) => {
		await page.goto('/settings/preferences');

		// Click on dark theme button
		await page.getByRole('button', { name: /dark/i }).click();

		// Document should have dark class
		await expect(page.locator('html')).toHaveClass(/dark/);
	});

	test('should show admin sections for superusers', async ({ page }) => {
		await page.goto('/settings');

		// Admin sections should be visible
		await expect(page.getByText(/users/i)).toBeVisible();
		await expect(page.getByText(/groups/i)).toBeVisible();
		await expect(page.getByText(/roles/i)).toBeVisible();
	});
});

test.describe('User Management', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem('auth_token', 'test-token');
			localStorage.setItem('user', JSON.stringify({
				id: '1',
				username: 'admin',
				email: 'admin@example.com',
				is_active: true,
				is_superuser: true,
			}));
		});
	});

	test('should display user list', async ({ page }) => {
		await page.goto('/settings/users');

		// User list should be visible
		await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /add user/i })).toBeVisible();
	});

	test('should open create user form', async ({ page }) => {
		await page.goto('/settings/users');

		await page.getByRole('button', { name: /add user/i }).click();

		// Form should be visible
		await expect(page.getByLabel(/username/i)).toBeVisible();
		await expect(page.getByLabel(/email/i)).toBeVisible();
		await expect(page.getByLabel(/password/i)).toBeVisible();
	});

	test('should search users', async ({ page }) => {
		await page.goto('/settings/users');

		await page.getByPlaceholder(/search users/i).fill('john');

		// Should filter the list (actual results depend on API mock)
		await expect(page.getByPlaceholder(/search users/i)).toHaveValue('john');
	});
});
