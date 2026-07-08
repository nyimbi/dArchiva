// (c) Copyright Datacraft, 2026
import { describe, expect, it, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/utils';
import { CameraCapture } from './CameraCapture';
import { ImageStitcher } from './ImageStitcher';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
	apiClient: {
		get: vi.fn(),
	},
}));

const mockedGet = vi.mocked(apiClient.get);

describe('scanning capture utilities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedGet.mockResolvedValue({ data: [], status: 200 });
	});

	it('exposes camera auto-detect and close controls', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(<CameraCapture onClose={onClose} />);

		await waitFor(() => {
			expect(mockedGet).toHaveBeenCalledWith('/scanning-projects/camera/devices');
		});

		const autoDetect = screen.getByRole('checkbox', {
			name: 'Auto-detect document corners before correction',
		});
		expect(autoDetect).toBeChecked();

		await user.click(autoDetect);
		expect(autoDetect).not.toBeChecked();

		await user.click(screen.getByRole('button', { name: 'Close camera capture' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('shows batch context and wires close for image stitching', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();

		render(<ImageStitcher batchId="batch-abcdef123456" onClose={onClose} />);

		expect(screen.getByText('Batch batch-ab')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Close image stitcher' }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
