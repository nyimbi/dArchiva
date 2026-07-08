// (c) Copyright Datacraft, 2026
import { describe, expect, it, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/utils';
import { ActivityPanel } from './ActivityPanel';
import { apiClient } from '@/lib/api-client';
import type { ActivityEvent } from './api';

vi.mock('@/lib/api-client', () => ({
	apiClient: {
		get: vi.fn(),
	},
}));

const mockedGet = vi.mocked(apiClient.get);

function makeEvent(index: number, eventType = 'document.viewed'): ActivityEvent {
	return {
		event_type: eventType,
		actor_name: index % 2 === 0 ? 'Ada Lovelace' : null,
		actor_id: `actor-${index}`,
		description: `${eventType} event ${index}`,
		timestamp: new Date(Date.UTC(2026, 0, 1, 12, index)).toISOString(),
		data: null,
	};
}

describe('ActivityPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGet.mockResolvedValue({
			data: {
				events: Array.from({ length: 51 }, (_, index) => makeEvent(index)),
				total: 51,
			},
			status: 200,
		});
	});

	it('requests one extra activity item to detect additional pages', async () => {
		render(<ActivityPanel documentId="doc-1" />);

		await screen.findByText('Audit Trail');

		expect(mockedGet).toHaveBeenCalledWith(
			'/activity/documents/doc-1/activity',
			{ params: { limit: 51, type: undefined } },
		);
		expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
		expect(screen.getByText('50 of 50 entries')).toBeInTheDocument();
	});

	it('sends the selected activity filter to the server and renders matching entries', async () => {
		const user = userEvent.setup();
		mockedGet
			.mockResolvedValueOnce({
				data: { events: [makeEvent(1, 'document.viewed')], total: 1 },
				status: 200,
			})
			.mockResolvedValueOnce({
				data: { events: [makeEvent(2, 'document.shared')], total: 1 },
				status: 200,
			});

		render(<ActivityPanel documentId="doc-2" />);

		await screen.findByText('document.viewed event 1');
		await user.click(screen.getByRole('button', { name: 'Shares' }));

		await screen.findByText('document.shared event 2');
		expect(mockedGet).toHaveBeenLastCalledWith(
			'/activity/documents/doc-2/activity',
			{ params: { limit: 51, type: 'shares' } },
		);
	});
});
