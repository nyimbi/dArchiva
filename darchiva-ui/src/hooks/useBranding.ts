// (c) Copyright Datacraft, 2026
/**
 * useBranding — app-level hook that fetches tenant branding once on mount,
 * applies --brand-primary as a CSS custom property, and caches in localStorage
 * to avoid FOUC on subsequent loads.
 *
 * Usage (called from App.tsx by the wiring agent):
 *   const { orgName, logoUrl, primaryColor } = useBranding();
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TenantBranding } from '@/features/tenants/types';

const LS_KEY = 'darchiva_branding';
const QUERY_KEY = ['tenant', 'branding'] as const;

interface BrandingState {
	orgName: string;
	logoUrl: string | null;
	primaryColor: string;
}

const DEFAULT_COLOR = '#228be6';

/** Read cached branding from localStorage synchronously (avoids FOUC). */
function readCache(): BrandingState | null {
	try {
		const raw = localStorage.getItem(LS_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as BrandingState;
	} catch {
		return null;
	}
}

function writeCache(state: BrandingState): void {
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(state));
	} catch {
		// storage quota exceeded — ignore
	}
}

function applyColor(color: string): void {
	document.documentElement.style.setProperty('--brand-primary', color);
}

export function useBranding(): BrandingState {
	// Apply cached color immediately (before first render / query resolves).
	const cached = readCache();
	if (cached?.primaryColor) {
		applyColor(cached.primaryColor);
	}

	const { data } = useQuery<TenantBranding>({
		queryKey: QUERY_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<TenantBranding>('/tenants/current/branding');
			return data;
		},
		staleTime: 5 * 60 * 1000,
		// Don't throw — gracefully fall back to defaults if the user isn't authenticated yet.
		retry: false,
	});

	useEffect(() => {
		if (!data) return;

		const color = data.primary_color ?? DEFAULT_COLOR;
		applyColor(color);

		const state: BrandingState = {
			orgName: '', // populated from tenant name (not branding), kept for convenience
			logoUrl: data.logo_url ?? null,
			primaryColor: color,
		};
		writeCache(state);
	}, [data]);

	if (data) {
		return {
			orgName: '',
			logoUrl: data.logo_url ?? null,
			primaryColor: data.primary_color ?? DEFAULT_COLOR,
		};
	}

	return cached ?? {
		orgName: '',
		logoUrl: null,
		primaryColor: DEFAULT_COLOR,
	};
}
