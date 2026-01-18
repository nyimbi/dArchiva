// (c) Copyright Datacraft, 2026
/**
 * Authentication and MFA type definitions.
 */

export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_code' | 'webauthn';

export type MFAEnrollmentStatus = 'not_enrolled' | 'pending' | 'enabled' | 'disabled';

export interface MFAEnrollment {
	method: MFAMethod;
	status: MFAEnrollmentStatus;
	enrolledAt?: string;
	lastUsedAt?: string;
}

export interface TOTPSetup {
	secret: string;
	provisioningUri: string;
	qrCodeBase64: string;
	backupCodes: string[];
}

export interface Passkey {
	id: string;
	credentialId: string;
	name: string;
	createdAt: string;
	lastUsedAt?: string;
	deviceType?: string;
	aaguid?: string;
}

export interface MFAStatus {
	totpEnabled: boolean;
	webauthnEnabled: boolean;
	backupCodesRemaining: number;
	lastVerifiedAt?: string;
}

export interface WebAuthnRegistrationOptions {
	challenge: string;
	rpId: string;
	rpName: string;
	userId: string;
	userName: string;
	userDisplayName: string;
	timeout: number;
	attestation: string;
	authenticatorSelection: {
		authenticatorAttachment: string;
		residentKey: string;
		userVerification: string;
	};
	pubKeyCredParams: Array<{ type: string; alg: number }>;
	excludeCredentials: Array<{ id: string; type: string; transports: string[] }>;
}

export interface WebAuthnAuthenticationOptions {
	challenge: string;
	rpId: string;
	timeout: number;
	userVerification: string;
	allowCredentials: Array<{ id: string; type: string; transports: string[] }>;
}
