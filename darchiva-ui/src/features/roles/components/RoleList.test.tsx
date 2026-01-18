// (c) Copyright Datacraft, 2026
/**
 * RoleList component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { RoleList } from './RoleList';

// Mock the API hooks
const mockUseRoles = vi.fn();
const mockUseDeleteRole = vi.fn();
const mockUseCloneRole = vi.fn();

vi.mock('../api', () => ({
	useRoles: () => mockUseRoles(),
	useDeleteRole: () => mockUseDeleteRole(),
	useCloneRole: () => mockUseCloneRole(),
}));

describe('RoleList', () => {
	const mockOnCreateRole = vi.fn();
	const mockOnEditRole = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDeleteRole.mockReturnValue({
			mutateAsync: vi.fn(),
			isPending: false,
		});
		mockUseCloneRole.mockReturnValue({
			mutateAsync: vi.fn(),
			isPending: false,
		});
	});

	it('renders loading skeleton when loading', () => {
		mockUseRoles.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<RoleList onCreateRole={mockOnCreateRole} onEditRole={mockOnEditRole} />);

		expect(document.querySelectorAll('[class*="skeleton"]').length).toBeGreaterThan(0);
	});

	it('renders empty state when no roles', async () => {
		mockUseRoles.mockReturnValue({
			data: { items: [], total: 0 },
			isLoading: false,
		});

		render(<RoleList onCreateRole={mockOnCreateRole} onEditRole={mockOnEditRole} />);

		await waitFor(() => {
			expect(screen.getByText('No roles found')).toBeInTheDocument();
		});
	});

	it('renders role list with role details', async () => {
		mockUseRoles.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						name: 'Administrator',
						description: 'Full system access',
						is_system: true,
						permissions: [{ id: 'p1' }, { id: 'p2' }],
						user_count: 5,
						group_count: 2,
					},
					{
						id: '2',
						name: 'Editor',
						description: 'Can edit documents',
						is_system: false,
						permissions: [{ id: 'p1' }],
						user_count: 10,
						group_count: 3,
					},
				],
				total: 2,
			},
			isLoading: false,
		});

		render(<RoleList onCreateRole={mockOnCreateRole} onEditRole={mockOnEditRole} />);

		await waitFor(() => {
			expect(screen.getByText('Administrator')).toBeInTheDocument();
			expect(screen.getByText('Editor')).toBeInTheDocument();
			expect(screen.getByText('Full system access')).toBeInTheDocument();
			expect(screen.getByText('Can edit documents')).toBeInTheDocument();
		});

		// System badge should be visible for system role
		expect(screen.getByText('System')).toBeInTheDocument();
	});

	it('calls onCreateRole when add button is clicked', async () => {
		mockUseRoles.mockReturnValue({
			data: { items: [], total: 0 },
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<RoleList onCreateRole={mockOnCreateRole} onEditRole={mockOnEditRole} />);

		await user.click(screen.getByText('Add Role'));

		expect(mockOnCreateRole).toHaveBeenCalledTimes(1);
	});

	it('shows permission and user counts', async () => {
		mockUseRoles.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						name: 'Editor',
						is_system: false,
						permissions: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
						user_count: 15,
						group_count: 4,
					},
				],
				total: 1,
			},
			isLoading: false,
		});

		render(<RoleList onCreateRole={mockOnCreateRole} onEditRole={mockOnEditRole} />);

		await waitFor(() => {
			expect(screen.getByText('3 permissions')).toBeInTheDocument();
			expect(screen.getByText('15 users')).toBeInTheDocument();
		});
	});

	it('opens clone dialog when clone menu item is clicked', async () => {
		mockUseRoles.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						name: 'Editor',
						is_system: false,
						permissions: [],
						user_count: 0,
						group_count: 0,
					},
				],
				total: 1,
			},
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<RoleList onCreateRole={mockOnCreateRole} onEditRole={mockOnEditRole} />);

		await waitFor(() => {
			expect(screen.getByText('Editor')).toBeInTheDocument();
		});

		// Click the dropdown menu
		const menuButton = screen.getByRole('button', { name: '' });
		await user.click(menuButton);

		// Click Clone
		await user.click(screen.getByText('Clone'));

		await waitFor(() => {
			expect(screen.getByText('Clone Role')).toBeInTheDocument();
			expect(screen.getByDisplayValue('Editor (Copy)')).toBeInTheDocument();
		});
	});
});
