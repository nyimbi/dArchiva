// (c) Copyright Datacraft, 2026
// Thin wrapper around localStorage with typed keys.
export function useUserPreferences() {
	const get = <T,>(key: string, defaultValue: T): T => {
		if (typeof window === 'undefined') return defaultValue;

		try {
			const value = window.localStorage.getItem(key);
			if (value === null) return defaultValue;
			return JSON.parse(value) as T;
		} catch {
			return defaultValue;
		}
	};

	const set = <T,>(key: string, value: T): void => {
		if (typeof window === 'undefined') return;

		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// Ignore unavailable or full storage; preferences are non-critical.
		}
	};

	return { get, set };
}
