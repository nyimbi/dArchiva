// (c) Copyright Datacraft, 2026
/**
 * Authentication context and provider.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface User {
	id: string;
	username: string;
	email: string;
	scopes: string[];
}

interface AuthContextType {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (username: string, password: string) => Promise<void>;
	logout: () => void;
	error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'darchiva_token';
const USER_KEY = 'darchiva_user';

function parseJwt(token: string): Record<string, unknown> | null {
	try {
		const base64Url = token.split('.')[1];
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		);
		return JSON.parse(jsonPayload);
	} catch {
		return null;
	}
}

function isTokenExpired(token: string): boolean {
	const payload = parseJwt(token);
	if (!payload || typeof payload.exp !== 'number') return true;
	return Date.now() >= payload.exp * 1000;
}

import { toast } from '@/hooks/use-toast';
import { AUTH_UNAUTHORIZED_EVENT, AUTH_FORBIDDEN_EVENT } from '@/lib/error-handler';

export function AuthProvider({ children }: { children: ReactNode }) {

	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Initialize from localStorage
	useEffect(() => {
		const storedToken = localStorage.getItem(TOKEN_KEY);
		const storedUser = localStorage.getItem(USER_KEY);

		if (storedToken && storedUser) {
			if (!isTokenExpired(storedToken)) {
				setToken(storedToken);
				setUser(JSON.parse(storedUser));
			} else {
				// Token expired, clear storage
				localStorage.removeItem(TOKEN_KEY);
				localStorage.removeItem(USER_KEY);
			}
		}
		setIsLoading(false);
	}, []);

	const login = useCallback(async (username: string, password: string) => {

		setError(null);
		setIsLoading(true);

		try {
			const formData = new URLSearchParams();
			formData.append('username', username);
			formData.append('password', password);

			const response = await fetch('/api/v1/auth/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formData,
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.detail || 'Login failed');
			}

			const data = await response.json();
			const accessToken = data.access_token;

			// Parse user info from token
			const payload = parseJwt(accessToken);
			if (!payload) {
				throw new Error('Invalid token received');
			}

			const userData: User = {
				id: payload.sub as string,
				username: payload.preferred_username as string,
				email: (payload.email as string) || `${payload.preferred_username}@local`,
				scopes: (payload.scopes as string[]) || [],
			};

			// Store in localStorage
			localStorage.setItem(TOKEN_KEY, accessToken);
			localStorage.setItem(USER_KEY, JSON.stringify(userData));

			setToken(accessToken);
			setUser(userData);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Login failed';
			setError(message);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const logout = useCallback(() => {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		setToken(null);
		setUser(null);
	}, []);

	// Handle unauthorized and forbidden events from API client
	useEffect(() => {
		const handleUnauthorized = () => {
			logout();
		};

		const handleForbidden = (event: Event) => {
			const customEvent = event as CustomEvent;
			const message = customEvent.detail?.message || "You don't have permission to perform this action.";
			toast({
				title: 'Access Denied',
				description: message,
				variant: 'destructive',
			});
		};

		window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
		window.addEventListener(AUTH_FORBIDDEN_EVENT, handleForbidden);
		return () => {
			window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
			window.removeEventListener(AUTH_FORBIDDEN_EVENT, handleForbidden);
		};
	}, [logout]);



	const value: AuthContextType = {
		user,
		token,
		isAuthenticated: !!user && !!token,
		isLoading,
		login,
		logout,
		error,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
