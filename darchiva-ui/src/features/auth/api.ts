// (c) Copyright Datacraft, 2026
/**
 * Authentication and MFA API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
	MFAStatus,
	TOTPSetup,
	Passkey,
	WebAuthnRegistrationOptions,
	WebAuthnAuthenticationOptions,
} from './types';

const MFA_API = '/mfa';
const WEBAUTHN_API = '/webauthn';

// ============ MFA Status ============

export function useMFAStatus() {
	return useQuery<MFAStatus>({
		queryKey: ['mfa', 'status'],
		queryFn: async () => {
			const { data } = await apiClient.get<MFAStatus>(`${MFA_API}/status`);
			return data;
		},
	});
}

// ============ TOTP ============

export function useTOTPSetup() {
	return useMutation<TOTPSetup, Error>({
		mutationFn: async () => {
			const { data } = await apiClient.post<TOTPSetup>(`${MFA_API}/totp/setup`);
			return data;
		},
	});
}

export function useEnableTOTP() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const { data } = await apiClient.post<{ success: boolean }>(`${MFA_API}/totp/enable`, { code });
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}

export function useVerifyTOTP() {
	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const { data } = await apiClient.post<{ success: boolean }>(`${MFA_API}/totp/verify`, { code });
			return data;
		},
	});
}

export function useDisableTOTP() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const { data } = await apiClient.post<{ success: boolean }>(`${MFA_API}/totp/disable`, { code });
			return data;
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
			const { data } = await apiClient.post<{ codes: string[]; remaining: number }>(
				`${MFA_API}/backup-codes/regenerate`,
				{ code }
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}

export function useVerifyBackupCode() {
	return useMutation<{ success: boolean }, Error, { code: string }>({
		mutationFn: async ({ code }) => {
			const { data } = await apiClient.post<{ success: boolean }>(`${MFA_API}/backup-codes/verify`, { code });
			return data;
		},
	});
}

// ============ Passkeys (WebAuthn) ============

export function usePasskeys() {
	return useQuery<{ passkeys: Passkey[] }>({
		queryKey: ['webauthn', 'passkeys'],
		queryFn: async () => {
			const { data } = await apiClient.get<{ passkeys: Passkey[] }>(`${WEBAUTHN_API}/passkeys`);
			return data;
		},
	});
}

export function useRegisterPasskeyBegin() {
	return useMutation<{ options: WebAuthnRegistrationOptions }, Error, { passkeyName?: string }>({
		mutationFn: async ({ passkeyName }) => {
			const { data } = await apiClient.post<{ options: WebAuthnRegistrationOptions }>(
				`${WEBAUTHN_API}/register/begin`,
				{ passkey_name: passkeyName }
			);
			return data;
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
			const { data } = await apiClient.post<{ success: boolean; passkeyId: string; passkeyName: string }>(
				`${WEBAUTHN_API}/register/complete`,
				{ challenge, credential, passkey_name: passkeyName }
			);
			return data;
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
			const { data } = await apiClient.post<{ options: WebAuthnAuthenticationOptions }>(
				`${WEBAUTHN_API}/authenticate/begin`,
				{ username }
			);
			return data;
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
			const { data } = await apiClient.post<{ success: boolean; userId: string; accessToken?: string }>(
				`${WEBAUTHN_API}/authenticate/complete`,
				{ challenge, credential }
			);
			return data;
		},
	});
}

export function useUpdatePasskey() {
	const queryClient = useQueryClient();

	return useMutation<{ success: boolean; name: string }, Error, { passkeyId: string; name: string }>({
		mutationFn: async ({ passkeyId, name }) => {
			const { data } = await apiClient.patch<{ success: boolean; name: string }>(
				`${WEBAUTHN_API}/passkeys/${passkeyId}`,
				{ name }
			);
			return data;
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
			const { data } = await apiClient.delete<{ success: boolean }>(`${WEBAUTHN_API}/passkeys/${passkeyId}`);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['webauthn', 'passkeys'] });
			queryClient.invalidateQueries({ queryKey: ['mfa', 'status'] });
		},
	});
}
