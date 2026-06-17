// (c) Copyright Datacraft, 2026
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'darchiva_theme';

export interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: ResolvedTheme;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
	} catch {
		// localStorage unavailable (SSR or private browsing edge cases)
	}
	return 'system';
}

function applyTheme(resolved: ResolvedTheme) {
	document.documentElement.classList.toggle('dark', resolved === 'dark');
}

interface ThemeProviderProps {
	children: React.ReactNode;
	defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(() => defaultTheme ?? readStoredTheme());
	const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

	// Keep system preference in sync
	useEffect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = (e: MediaQueryListEvent) => {
			setSystemTheme(e.matches ? 'dark' : 'light');
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);

	const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

	// Apply class to <html> whenever resolved theme changes
	useEffect(() => {
		applyTheme(resolvedTheme);
	}, [resolvedTheme]);

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore
		}
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({ theme, setTheme, resolvedTheme }),
		[theme, setTheme, resolvedTheme],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
	return ctx;
}
