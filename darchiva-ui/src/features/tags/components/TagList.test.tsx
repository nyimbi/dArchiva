// (c) Copyright Datacraft, 2026
/**
 * TagList component tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { TagList } from './TagList';

// Mock the API hooks
const mockUseTags = vi.fn();
const mockUseDeleteTag = vi.fn();

vi.mock('../api', () => ({
	useTags: () => mockUseTags(),
	useDeleteTag: () => mockUseDeleteTag(),
}));

describe('TagList', () => {
	const mockOnSelect = vi.fn();
	const mockOnEdit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDeleteTag.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
		});
	});

	it('renders loading skeleton when loading', () => {
		mockUseTags.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<TagList onSelect={mockOnSelect} onEdit={mockOnEdit} />);

		// Should show skeleton loaders
		const skeletons = document.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('renders empty state when no tags', async () => {
		mockUseTags.mockReturnValue({
			data: { items: [] },
			isLoading: false,
		});

		render(<TagList onSelect={mockOnSelect} onEdit={mockOnEdit} />);

		await waitFor(() => {
			expect(screen.getByText('No tags yet')).toBeInTheDocument();
		});
	});

	it('renders tags in a tree structure', async () => {
		mockUseTags.mockReturnValue({
			data: {
				items: [
					{ id: '1', name: 'Documents', color: '#3B82F6', parent_id: null, document_count: 5 },
					{ id: '2', name: 'Archive', color: '#10B981', parent_id: null, document_count: 3 },
				],
			},
			isLoading: false,
		});

		render(<TagList onSelect={mockOnSelect} onEdit={mockOnEdit} />);

		await waitFor(() => {
			expect(screen.getByText('Documents')).toBeInTheDocument();
			expect(screen.getByText('Archive')).toBeInTheDocument();
		});
	});

	it('calls onSelect when a tag is clicked', async () => {
		mockUseTags.mockReturnValue({
			data: {
				items: [
					{ id: '1', name: 'Documents', color: '#3B82F6', parent_id: null, document_count: 5 },
				],
			},
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<TagList onSelect={mockOnSelect} onEdit={mockOnEdit} />);

		await user.click(screen.getByText('Documents'));

		expect(mockOnSelect).toHaveBeenCalledWith(
			expect.objectContaining({ id: '1', name: 'Documents' })
		);
	});

	it('filters tags by search query', async () => {
		mockUseTags.mockReturnValue({
			data: {
				items: [
					{ id: '1', name: 'Documents', color: '#3B82F6', parent_id: null, document_count: 5 },
					{ id: '2', name: 'Archive', color: '#10B981', parent_id: null, document_count: 3 },
				],
			},
			isLoading: false,
		});

		const user = userEvent.setup();
		render(<TagList onSelect={mockOnSelect} onEdit={mockOnEdit} />);

		const searchInput = screen.getByPlaceholderText('Search tags...');
		await user.type(searchInput, 'Doc');

		await waitFor(() => {
			expect(screen.getByText('Documents')).toBeInTheDocument();
			expect(screen.queryByText('Archive')).not.toBeInTheDocument();
		});
	});
});
