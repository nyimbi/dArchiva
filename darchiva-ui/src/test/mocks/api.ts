// (c) Copyright Datacraft, 2026
/**
 * API mocking utilities for tests.
 */
import { vi } from 'vitest';

export const mockApi = {
	get: vi.fn(),
	post: vi.fn(),
	patch: vi.fn(),
	put: vi.fn(),
	delete: vi.fn(),
};

vi.mock('@/lib/api', () => ({
	api: mockApi,
}));

export function resetApiMocks() {
	mockApi.get.mockReset();
	mockApi.post.mockReset();
	mockApi.patch.mockReset();
	mockApi.put.mockReset();
	mockApi.delete.mockReset();
}

export function mockApiResponse<T>(method: keyof typeof mockApi, data: T) {
	mockApi[method].mockResolvedValueOnce({ data });
}

export function mockApiError(method: keyof typeof mockApi, error: Error | string) {
	const err = typeof error === 'string' ? new Error(error) : error;
	mockApi[method].mockRejectedValueOnce(err);
}
