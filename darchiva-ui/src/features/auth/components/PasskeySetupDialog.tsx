// (c) Copyright Datacraft, 2026
/**
 * Passkey (WebAuthn) setup dialog.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	X,
	Key,
	Fingerprint,
	Check,
	AlertTriangle,
	Loader2,
	Shield,
} from 'lucide-react';
import { useRegisterPasskeyBegin, useRegisterPasskeyComplete } from '../api';

interface PasskeySetupDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

type Step = 'intro' | 'name' | 'registering' | 'success' | 'error';

// Base64URL encoding/decoding utilities
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function PasskeySetupDialog({ isOpen, onClose }: PasskeySetupDialogProps) {
	const [step, setStep] = useState<Step>('intro');
	const [passkeyName, setPasskeyName] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [challenge, setChallenge] = useState<string | null>(null);

	const beginMutation = useRegisterPasskeyBegin();
	const completeMutation = useRegisterPasskeyComplete();

	const handleStartRegistration = useCallback(async () => {
		if (!passkeyName.trim()) return;

		setStep('registering');
		setError(null);

		try {
			// Get registration options from server
			const { options } = await beginMutation.mutateAsync({
				passkeyName: passkeyName.trim(),
			});

			setChallenge(options.challenge);

			// Convert options for WebAuthn API
			const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
				challenge: base64UrlToArrayBuffer(options.challenge),
				rp: {
					id: options.rpId,
					name: options.rpName,
				},
				user: {
					id: base64UrlToArrayBuffer(options.userId),
					name: options.userName,
					displayName: options.userDisplayName,
				},
				pubKeyCredParams: options.pubKeyCredParams.map((param) => ({
					type: param.type as 'public-key',
					alg: param.alg,
				})),
				authenticatorSelection: {
					authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment as AuthenticatorAttachment,
					residentKey: options.authenticatorSelection.residentKey as ResidentKeyRequirement,
					userVerification: options.authenticatorSelection.userVerification as UserVerificationRequirement,
				},
				timeout: options.timeout,
				attestation: options.attestation as AttestationConveyancePreference,
				excludeCredentials: options.excludeCredentials.map((cred) => ({
					id: base64UrlToArrayBuffer(cred.id),
					type: 'public-key' as const,
					transports: cred.transports as AuthenticatorTransport[],
				})),
			};

			// Call WebAuthn API
			const credential = await navigator.credentials.create({
				publicKey: publicKeyCredentialCreationOptions,
			}) as PublicKeyCredential;

			if (!credential) {
				throw new Error('Failed to create credential');
			}

			const response = credential.response as AuthenticatorAttestationResponse;

			// Convert credential for server
			const credentialData = {
				id: credential.id,
				rawId: arrayBufferToBase64Url(credential.rawId),
				type: credential.type,
				response: {
					clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
					attestationObject: arrayBufferToBase64Url(response.attestationObject),
					transports: response.getTransports?.() || [],
				},
			};

			// Complete registration on server
			await completeMutation.mutateAsync({
				challenge: options.challenge,
				credential: credentialData,
				passkeyName: passkeyName.trim(),
			});

			setStep('success');
		} catch (err) {
			console.error('Passkey registration error:', err);
			setError(
				err instanceof Error
					? err.message
					: 'Failed to register passkey. Please try again.'
			);
			setStep('error');
		}
	}, [passkeyName, beginMutation, completeMutation]);

	const handleClose = () => {
		onClose();
		// Reset state after animation
		setTimeout(() => {
			setStep('intro');
			setPasskeyName('');
			setError(null);
			setChallenge(null);
		}, 300);
	};

	const handleRetry = () => {
		setStep('name');
		setError(null);
	};

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onClick={handleClose}
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<Key className="w-5 h-5 text-blue-600" />
							</div>
							<h2 className="font-semibold text-gray-900">Add Passkey</h2>
						</div>
						<button
							onClick={handleClose}
							className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<div className="p-6">
						<AnimatePresence mode="wait">
							{step === 'intro' && (
								<motion.div
									key="intro"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									className="text-center"
								>
									<div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
										<Fingerprint className="w-10 h-10 text-blue-600" />
									</div>
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										Passwordless Login
									</h3>
									<p className="text-gray-500 mb-6">
										Passkeys let you sign in with your fingerprint, face, or screen
										lock instead of a password. They&apos;re more secure and convenient.
									</p>

									<div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
										<h4 className="font-medium text-gray-900 mb-2">
											What you&apos;ll need:
										</h4>
										<ul className="space-y-2 text-sm text-gray-600">
											<li className="flex items-center gap-2">
												<Check className="w-4 h-4 text-emerald-600" />
												A device with biometric authentication (Touch ID, Face ID,
												Windows Hello)
											</li>
											<li className="flex items-center gap-2">
												<Check className="w-4 h-4 text-emerald-600" />
												Or a hardware security key (YubiKey, etc.)
											</li>
										</ul>
									</div>

									<button
										onClick={() => setStep('name')}
										className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
									>
										Continue
									</button>
								</motion.div>
							)}

							{step === 'name' && (
								<motion.div
									key="name"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
								>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Name Your Passkey
									</h3>
									<p className="text-gray-500 mb-6">
										Give this passkey a name to help you identify it later.
									</p>

									<input
										type="text"
										value={passkeyName}
										onChange={(e) => setPasskeyName(e.target.value)}
										placeholder='e.g., "MacBook Pro", "iPhone 15"'
										className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										autoFocus
									/>

									<p className="text-xs text-gray-400 mt-2 mb-6">
										This name is only visible to you.
									</p>

									<button
										onClick={handleStartRegistration}
										disabled={!passkeyName.trim()}
										className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										Create Passkey
									</button>
								</motion.div>
							)}

							{step === 'registering' && (
								<motion.div
									key="registering"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									className="text-center py-8"
								>
									<motion.div
										animate={{ rotate: 360 }}
										transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
										className="w-16 h-16 mx-auto mb-6"
									>
										<Loader2 className="w-16 h-16 text-blue-600" />
									</motion.div>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Creating Passkey
									</h3>
									<p className="text-gray-500">
										Follow the prompts on your device to complete registration...
									</p>
								</motion.div>
							)}

							{step === 'success' && (
								<motion.div
									key="success"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									className="text-center"
								>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ type: 'spring', delay: 0.1 }}
										className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
									>
										<Check className="w-8 h-8 text-emerald-600" />
									</motion.div>
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										Passkey Added
									</h3>
									<p className="text-gray-500 mb-6">
										Your passkey &quot;{passkeyName}&quot; has been registered.
										You can now use it to sign in.
									</p>
									<button
										onClick={handleClose}
										className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
									>
										Done
									</button>
								</motion.div>
							)}

							{step === 'error' && (
								<motion.div
									key="error"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									className="text-center"
								>
									<div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
										<AlertTriangle className="w-8 h-8 text-red-600" />
									</div>
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										Registration Failed
									</h3>
									<p className="text-gray-500 mb-2">{error}</p>
									<p className="text-sm text-gray-400 mb-6">
										This can happen if you cancelled the prompt or your device
										doesn&apos;t support passkeys.
									</p>
									<div className="flex gap-3">
										<button
											onClick={handleClose}
											className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
										>
											Cancel
										</button>
										<button
											onClick={handleRetry}
											className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
										>
											Try Again
										</button>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
