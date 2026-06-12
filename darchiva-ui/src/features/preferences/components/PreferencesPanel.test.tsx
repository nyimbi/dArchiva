// (c) Copyright Datacraft, 2026
/**
 * PreferencesPanel component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { PreferencesPanel } from './PreferencesPanel';
import { DEFAULT_PREFERENCES } from '../types';

// Mock the API hooks
const mockUsePreferences = vi.fn();
const mockUseUpdatePreferences = vi.fn();
const mockUseResetPreferences = vi.fn();

vi.mock('../api', () => ({
	usePreferences: () => mockUsePreferences(),
	useUpdatePreferences: () => mockUseUpdatePreferences(),
	useResetPreferences: () => mockUseResetPreferences(),
}));

describe('PreferencesPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseUpdatePreferences.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		});
		mockUseResetPreferences.mockReturnValue({
			mutateAsync: vi.fn(),
			isPending: false,
		});
	});

	it('renders loading skeleton when loading', () => {
		mockUsePreferences.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<PreferencesPanel />);

		expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
	});

	it('renders preference sections when loaded', async () => {
		mockUsePreferences.mockReturnValue({
			data: DEFAULT_PREFERENCES,
			isLoading: false,
		});

		render(<PreferencesPanel />);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Document Browser' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Language & Region' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Keyboard' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Privacy' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Scanner' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'OCR' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
		});
	});

	it('shows appearance settings by default', async () => {
		mockUsePreferences.mockReturnValue({
			data: DEFAULT_PREFERENCES,
			isLoading: false,
		});

		render(<PreferencesPanel />);

		await waitFor(() => {
			expect(screen.getByText('Customize the look and feel')).toBeInTheDocument();
			expect(screen.getByText('Light')).toBeInTheDocument();
			expect(screen.getByText('Dark')).toBeInTheDocument();
			expect(screen.getByText('System')).toBeInTheDocument();
		});
	});

	it('switches between sections when clicking navigation', async () => {
		mockUsePreferences.mockReturnValue({
			data: DEFAULT_PREFERENCES,
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<PreferencesPanel />);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument();
		});

		// Click on Notifications section
		await user.click(screen.getByRole('button', { name: /Notifications/i }));

		await waitFor(() => {
			expect(screen.getByText('How and when to be notified')).toBeInTheDocument();
			expect(screen.getByText('Email Notifications')).toBeInTheDocument();
			expect(screen.getByText('Browser Notifications')).toBeInTheDocument();
		});
	});

	it('calls update when toggling a preference', async () => {
		const mockMutate = vi.fn();
		mockUseUpdatePreferences.mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		});
		mockUsePreferences.mockReturnValue({
			data: DEFAULT_PREFERENCES,
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<PreferencesPanel />);

		await waitFor(() => {
			expect(screen.getByText('Compact Mode')).toBeInTheDocument();
		});

		// Toggle compact mode
		const compactModeSwitch = screen.getAllByRole('switch')[0];
		await user.click(compactModeSwitch);

		expect(mockMutate).toHaveBeenCalledWith({ compact_mode: true });
	});

	it('shows reset confirmation dialog', async () => {
		mockUsePreferences.mockReturnValue({
			data: DEFAULT_PREFERENCES,
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<PreferencesPanel />);

		await waitFor(() => {
			expect(screen.getByText('Reset All')).toBeInTheDocument();
		});

		await user.click(screen.getByText('Reset All'));

		await waitFor(() => {
			expect(screen.getByText('Reset Preferences')).toBeInTheDocument();
			expect(screen.getByText(/This will reset all your preferences/)).toBeInTheDocument();
		});
	});

	it('calls reset when confirmed', async () => {
		const mockResetAsync = vi.fn();
		mockUseResetPreferences.mockReturnValue({
			mutateAsync: mockResetAsync,
			isPending: false,
		});
		mockUsePreferences.mockReturnValue({
			data: DEFAULT_PREFERENCES,
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<PreferencesPanel />);

		await user.click(screen.getByText('Reset All'));

		await waitFor(() => {
			expect(screen.getByRole('alertdialog')).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole('button', { name: 'Reset' });
		await user.click(confirmButton);

		expect(mockResetAsync).toHaveBeenCalled();
	});
});
