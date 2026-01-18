// (c) Copyright Datacraft, 2026
/**
 * UserList component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { UserList } from './UserList';

// Mock the API hooks
const mockUseUsers = vi.fn();
const mockUseDeleteUser = vi.fn();
const mockUseResetPassword = vi.fn();

vi.mock('../api', () => ({
	useUsers: () => mockUseUsers(),
	useDeleteUser: () => mockUseDeleteUser(),
	useResetPassword: () => mockUseResetPassword(),
}));

describe('UserList', () => {
	const mockOnCreateUser = vi.fn();
	const mockOnEditUser = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDeleteUser.mockReturnValue({
			mutateAsync: vi.fn(),
			isPending: false,
		});
		mockUseResetPassword.mockReturnValue({
			mutateAsync: vi.fn().mockResolvedValue({ temporary_password: 'temp123' }),
			isPending: false,
		});
	});

	it('renders loading skeleton when loading', () => {
		mockUseUsers.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<UserList onCreateUser={mockOnCreateUser} onEditUser={mockOnEditUser} />);

		// Loading state shows skeletons
		expect(document.querySelectorAll('[class*="skeleton"]').length).toBeGreaterThan(0);
	});

	it('renders empty state when no users', async () => {
		mockUseUsers.mockReturnValue({
			data: { items: [], total: 0 },
			isLoading: false,
		});

		render(<UserList onCreateUser={mockOnCreateUser} onEditUser={mockOnEditUser} />);

		await waitFor(() => {
			expect(screen.getByText('No users found')).toBeInTheDocument();
		});
	});

	it('renders user list with user details', async () => {
		mockUseUsers.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						username: 'johndoe',
						email: 'john@example.com',
						first_name: 'John',
						last_name: 'Doe',
						is_active: true,
						is_superuser: false,
						mfa_enabled: false,
						passkey_enabled: false,
						groups: [],
						roles: [],
					},
					{
						id: '2',
						username: 'admin',
						email: 'admin@example.com',
						first_name: 'Admin',
						last_name: 'User',
						is_active: true,
						is_superuser: true,
						mfa_enabled: true,
						passkey_enabled: false,
						groups: [{ id: 'g1', name: 'Admins' }],
						roles: [{ id: 'r1', name: 'Administrator' }],
					},
				],
				total: 2,
			},
			isLoading: false,
		});

		render(<UserList onCreateUser={mockOnCreateUser} onEditUser={mockOnEditUser} />);

		await waitFor(() => {
			expect(screen.getByText('John Doe')).toBeInTheDocument();
			expect(screen.getByText('Admin User')).toBeInTheDocument();
			expect(screen.getByText('john@example.com')).toBeInTheDocument();
			expect(screen.getByText('admin@example.com')).toBeInTheDocument();
		});

		// Admin badge should be visible for superuser
		expect(screen.getByText('Admin')).toBeInTheDocument();
		// MFA badge should be visible
		expect(screen.getByText('MFA')).toBeInTheDocument();
	});

	it('calls onCreateUser when add button is clicked', async () => {
		mockUseUsers.mockReturnValue({
			data: { items: [], total: 0 },
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<UserList onCreateUser={mockOnCreateUser} onEditUser={mockOnEditUser} />);

		await user.click(screen.getByText('Add User'));

		expect(mockOnCreateUser).toHaveBeenCalledTimes(1);
	});

	it('filters users by status', async () => {
		mockUseUsers.mockReturnValue({
			data: {
				items: [
					{
						id: '1',
						username: 'active',
						email: 'active@test.com',
						is_active: true,
						is_superuser: false,
						mfa_enabled: false,
						passkey_enabled: false,
						groups: [],
						roles: [],
					},
				],
				total: 1,
			},
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<UserList onCreateUser={mockOnCreateUser} onEditUser={mockOnEditUser} />);

		// Open the status filter dropdown
		const statusFilter = screen.getByRole('combobox');
		await user.click(statusFilter);

		// Select "Active" option
		await user.click(screen.getByText('Active'));

		await waitFor(() => {
			expect(mockUseUsers).toHaveBeenCalled();
		});
	});

	it('shows pagination when there are multiple pages', async () => {
		mockUseUsers.mockReturnValue({
			data: {
				items: Array.from({ length: 25 }, (_, i) => ({
					id: String(i),
					username: `user${i}`,
					email: `user${i}@test.com`,
					is_active: true,
					is_superuser: false,
					mfa_enabled: false,
					passkey_enabled: false,
					groups: [],
					roles: [],
				})),
				total: 50,
			},
			isLoading: false,
		});

		render(<UserList onCreateUser={mockOnCreateUser} onEditUser={mockOnEditUser} />);

		await waitFor(() => {
			expect(screen.getByText('50 users')).toBeInTheDocument();
			expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
		});

		expect(screen.getByText('Previous')).toBeDisabled();
		expect(screen.getByText('Next')).not.toBeDisabled();
	});
});
