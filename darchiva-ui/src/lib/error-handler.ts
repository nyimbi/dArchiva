// (c) Copyright Datacraft, 2026

/**
 * Custom event name for unauthorized access.
 */
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';
export const AUTH_FORBIDDEN_EVENT = 'auth:forbidden';

/**
 * API Error class to hold status and message.
 */
export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * Centralized error handler for API responses.
 * @param response The fetch Response object.
 * @throws ApiError
 */
export async function handleApiError(response: Response): Promise<never> {
	const status = response.status;
	let message = `API error: ${status}`;

	try {
		const data = await response.json();
		message = data.detail || data.message || message;
	} catch {
		// Response is not JSON or doesn't have detail/message
	}

	if (status === 401) {
		// Session expired or invalid token - trigger logout
		window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
	} else if (status === 403) {
		// Permission denied - notify user but don't logout
		window.dispatchEvent(new CustomEvent(AUTH_FORBIDDEN_EVENT, { detail: { message } }));
	}

	throw new ApiError(status, message);
}
