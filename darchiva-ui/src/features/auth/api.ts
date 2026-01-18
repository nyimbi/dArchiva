// (c) Copyright Datacraft, 2026
/**
 * Authentication and MFA API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	MFAStatus,
	TOTPSetup,
	Passkey,
	WebAuthnRegistrationOptions,
	WebAuthnAuthenticationOptions,
} from './types';

const MFA_API = '/api/v1/mfa';
const WEBAUTHN_API = '/api/v1/webauthn';

// ============ MFA Status ============

export function useMFAStatus() {
	return useQuery<MFAStatus>({
		queryKey: ['mfa', 'status'],
		queryFn: async () => {
			const response = await fetch(`${MFA_API}/status`);
			if (!response.ok) throw new Error('Failed to fetch MFA status');
			return response.json();
		},
	});
}

// ============ TOTP ============

export function useTOTPSetup() {
	return useMutation<TOTPSetup, Error>({
		mutationFn: async () => {
			const response = await fetch(`${MFA_API}/totp/setup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			if (!response.ok) throw new Error('Failed to setup TOTP');
			return response.json();
		},
	});
}

export function useEnableTOTP() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const response = await fetch(`${MFA_API}/totp/enable`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			if (!response.ok) throw new Error('Invalid TOTP code');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}

export function useVerifyTOTP() {
	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const response = await fetch(`${MFA_API}/totp/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			if (!response.ok) throw new Error('Invalid TOTP code');
			return response.json();
		},
	});
}

export function useDisableTOTP() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const response = await fetch(`${MFA_API}/totp/disable`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			if (!response.ok) throw new Error('Failed to disable TOTP');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}

// ============ Backup Codes ============

export function useRegenerateBackupCodes() {
	const queryClient = useQueryClient();

	return useMutation<{ codes: string[]; remaining: number }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const response = await fetch(`${MFA_API}/backup-codes/regenerate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			if (!response.ok) throw new Error('Failed to regenerate backup codes');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}

export function useVerifyBackupCode() {
	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const response = await fetch(`${MFA_API}/backup-codes/verify`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});
			if (!response.ok) throw new Error('Invalid backup code');
			return response.json();
		},
	});
}

// ============ Passkeys (WebAuthn) ============

export function usePasskeys() {
	return useQuery<{ passkeys: Passkey[] }>({
		queryKey: ['webauthn', 'passkeys'],
		queryFn: async () => {
			const response = await fetch(`${WEBAUTHN_API}/passkeys`);
			if (!response.ok) throw new Error('Failed to fetch passkeys');
			return response.json();
		},
	});
}

export function useRegisterPasskeyBegin() {
	return useMutation<{ options: WebAuthnRegistrationOptions }, Error, { passkeyName?: string }>({
		mutationFn: async ({ passkeyName }) => {
			const response = await fetch(`${WEBAUTHN_API}/register/begin`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ passkey_name: passkeyName }),
			});
			if (!response.ok) throw new Error('Failed to begin passkey registration');
			return response.json();
		},
	});
}

export function useRegisterPasskeyComplete() {
	const queryClient = useQueryClient();

	return useMutation<
		{ success: boolean; passkeyId: string; passkeyName: string },
		Error,
		{ challenge: string; credential: unknown; passkeyName?: string }
	>({
		mutationFn: async ({ challenge, credential, passkeyName }) => {
			const response = await fetch(`${WEBAUTHN_API}/register/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challenge,
					credential,
					passkey_name: passkeyName,
				}),
			});
			if (!response.ok) throw new Error('Failed to complete passkey registration');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webauthn', 'passkeys'] });
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}

export function useAuthenticatePasskeyBegin() {
	return useMutation<{ options: WebAuthnAuthenticationOptions }, Error, { username?: string }>({
		mutationFn: async ({ username }) => {
			const response = await fetch(`${WEBAUTHN_API}/authenticate/begin`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username }),
			});
			if (!response.ok) throw new Error('Failed to begin passkey authentication');
			return response.json();
		},
	});
}

export function useAuthenticatePasskeyComplete() {
	return useMutation<
		{ success: boolean; userId: string; accessToken?: string },
		Error,
		{ challenge: string; credential: unknown }
	>({
		mutationFn: async ({ challenge, credential }) => {
			const response = await fetch(`${WEBAUTHN_API}/authenticate/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ challenge, credential }),
			});
			if (!response.ok) throw new Error('Failed to authenticate with passkey');
			return response.json();
		},
	});
}

export function useUpdatePasskey() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean; name: string }, Error, { passkeyId: string; name: string }>({
		mutationFn: async ({ passkeyId, name }) => {
			const response = await fetch(`${WEBAUTHN_API}/passkeys/${passkeyId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			});
			if (!response.ok) throw new Error('Failed to update passkey');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webauthn', 'passkeys'] });
		},
	});
}

export function useDeletePasskey() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean }, Error, { passkeyId: string }>({
		mutationFn: async ({ passkeyId }) => {
			const response = await fetch(`${WEBAUTHN_API}/passkeys/${passkeyId}`, {
				method: 'DELETE',
			});
			if (!response.ok) throw new Error('Failed to delete passkey');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webauthn', 'passkeys'] });
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}
