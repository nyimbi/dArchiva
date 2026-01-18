// (c) Copyright Datacraft, 2026
/**
 * Document management E2E tests.
 */
import { test, expect } from '@playwright/test';

test.describe('Document Browser', () => {
	test.beforeEach(async ({ page }) => {
		// Mock authentication
		await page.addInitScript(() => {
			localStorage.setItem('auth_token', 'test-token');
			localStorage.setItem('user', JSON.stringify({
				id: '1',
				username: 'testuser',
				email: 'test@example.com',
				is_active: true,
			}));
		});
	});

	test('should display document browser', async ({ page }) => {
		await page.goto('/documents');

		// Document browser should be visible
		await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible();
	});

	test('should show folder tree', async ({ page }) => {
		await page.goto('/documents');

		// Folder tree panel should be visible
		await expect(page.getByTestId('folder-tree')).toBeVisible();
	});

	test('should allow view mode switching', async ({ page }) => {
		await page.goto('/documents');

		// Grid view button
		const gridButton = page.getByRole('button', { name: /grid/i });
		const listButton = page.getByRole('button', { name: /list/i });

		await expect(gridButton).toBeVisible();
		await expect(listButton).toBeVisible();

		// Switch to list view
		await listButton.click();
		await expect(page.getByTestId('document-list')).toBeVisible();

		// Switch back to grid
		await gridButton.click();
		await expect(page.getByTestId('document-grid')).toBeVisible();
	});

	test('should open search on keyboard shortcut', async ({ page }) => {
		await page.goto('/documents');

		// Press Cmd+K or Ctrl+K
		await page.keyboard.press('Meta+k');

		// Search dialog should open
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByPlaceholder(/search/i)).toBeVisible();
	});
});
