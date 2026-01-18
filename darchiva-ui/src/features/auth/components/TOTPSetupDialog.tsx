// (c) Copyright Datacraft, 2026
/**
 * TOTP setup dialog with QR code and verification.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	X,
	Smartphone,
	Copy,
	Check,
	AlertTriangle,
	ChevronRight,
	ChevronLeft,
	Eye,
	EyeOff,
	Download,
	Shield,
} from 'lucide-react';
import { useTOTPSetup, useEnableTOTP } from '../api';
import type { TOTPSetup } from '../types';

interface TOTPSetupDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

type Step = 'intro' | 'scan' | 'verify' | 'backup' | 'complete';

function StepIndicator({ current, total }: { current: number; total: number }) {
	return (
		<div className="flex items-center justify-center gap-2">
			{Array.from({ length: total }, (_, i) => (
				<div
					key={i}
					className={`w-2 h-2 rounded-full transition-colors ${
						i < current
							? 'bg-blue-600'
							: i === current
								? 'bg-blue-400'
								: 'bg-gray-200'
					}`}
				/>
			))}
		</div>
	);
}

export function TOTPSetupDialog({ isOpen, onClose }: TOTPSetupDialogProps) {
	const [step, setStep] = useState<Step>('intro');
	const [setup, setSetup] = useState<TOTPSetup | null>(null);
	const [verifyCode, setVerifyCode] = useState('');
	const [showSecret, setShowSecret] = useState(false);
	const [copiedSecret, setCopiedSecret] = useState(false);
	const [copiedBackup, setCopiedBackup] = useState(false);

	const setupMutation = useTOTPSetup();
	const enableMutation = useEnableTOTP();

	const handleStart = async () => {
		const result = await setupMutation.mutateAsync();
		setSetup(result);
		setStep('scan');
	};

	const handleVerify = async () => {
		try {
			await enableMutation.mutateAsync({ code: verifyCode });
			setStep('backup');
		} catch (e) {
			// Error is handled by mutation
		}
	};

	const handleCopySecret = useCallback(() => {
		if (setup?.secret) {
			navigator.clipboard.writeText(setup.secret);
			setCopiedSecret(true);
			setTimeout(() => setCopiedSecret(false), 2000);
		}
	}, [setup?.secret]);

	const handleCopyBackupCodes = useCallback(() => {
		if (setup?.backupCodes) {
			navigator.clipboard.writeText(setup.backupCodes.join('\n'));
			setCopiedBackup(true);
			setTimeout(() => setCopiedBackup(false), 2000);
		}
	}, [setup?.backupCodes]);

	const handleDownloadBackupCodes = useCallback(() => {
		if (setup?.backupCodes) {
			const content = `dArchiva Backup Codes
Generated: ${new Date().toISOString()}

Store these codes in a secure location.
Each code can only be used once.

${setup.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

If you lose access to your authenticator app,
use one of these codes to sign in.
`;
			const blob = new Blob([content], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'darchiva-backup-codes.txt';
			a.click();
			URL.revokeObjectURL(url);
		}
	}, [setup?.backupCodes]);

	const handleClose = () => {
		onClose();
		// Reset state after animation
		setTimeout(() => {
			setStep('intro');
			setSetup(null);
			setVerifyCode('');
			setShowSecret(false);
		}, 300);
	};

	if (!isOpen) return null;

	const stepNumber = ['intro', 'scan', 'verify', 'backup', 'complete'].indexOf(step);

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
					className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-purple-100 rounded-lg">
								<Smartphone className="w-5 h-5 text-purple-600" />
							</div>
							<div>
								<h2 className="font-semibold text-gray-900">
									Set Up Authenticator App
								</h2>
								<p className="text-sm text-gray-500">
									Step {stepNumber + 1} of 5
								</p>
							</div>
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
									<div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
										<Shield className="w-8 h-8 text-purple-600" />
									</div>
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										Add Extra Security
									</h3>
									<p className="text-gray-500 mb-6 max-w-sm mx-auto">
										Two-factor authentication adds an extra layer of security to your
										account. You&apos;ll need your password and a code from your
										authenticator app to sign in.
									</p>
									<p className="text-sm text-gray-400 mb-6">
										Recommended apps: Google Authenticator, Authy, 1Password
									</p>
									<button
										onClick={handleStart}
										disabled={setupMutation.isPending}
										className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
									>
										{setupMutation.isPending ? 'Setting up...' : 'Get Started'}
									</button>
								</motion.div>
							)}

							{step === 'scan' && setup && (
								<motion.div
									key="scan"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
								>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Scan QR Code
									</h3>
									<p className="text-gray-500 mb-6">
										Open your authenticator app and scan this QR code to add your account.
									</p>

									{/* QR Code */}
									<div className="bg-white p-4 rounded-xl border border-gray-200 inline-block mx-auto mb-4">
										<img
											src={`data:image/png;base64,${setup.qrCodeBase64}`}
											alt="TOTP QR Code"
											className="w-48 h-48"
										/>
									</div>

									{/* Manual entry */}
									<div className="bg-gray-50 rounded-lg p-4 mb-6">
										<p className="text-sm text-gray-500 mb-2">
											Can&apos;t scan? Enter this code manually:
										</p>
										<div className="flex items-center gap-2">
											<code className="flex-1 font-mono text-sm bg-white px-3 py-2 rounded border border-gray-200 overflow-hidden">
												{showSecret ? setup.secret : '••••••••••••••••'}
											</code>
											<button
												onClick={() => setShowSecret(!showSecret)}
												className="p-2 text-gray-400 hover:text-gray-600"
											>
												{showSecret ? (
													<EyeOff className="w-4 h-4" />
												) : (
													<Eye className="w-4 h-4" />
												)}
											</button>
											<button
												onClick={handleCopySecret}
												className="p-2 text-gray-400 hover:text-gray-600"
											>
												{copiedSecret ? (
													<Check className="w-4 h-4 text-emerald-600" />
												) : (
													<Copy className="w-4 h-4" />
												)}
											</button>
										</div>
									</div>

									<button
										onClick={() => setStep('verify')}
										className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
									>
										Continue
										<ChevronRight className="w-4 h-4" />
									</button>
								</motion.div>
							)}

							{step === 'verify' && (
								<motion.div
									key="verify"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
								>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Verify Setup
									</h3>
									<p className="text-gray-500 mb-6">
										Enter the 6-digit code from your authenticator app to verify setup.
									</p>

									<input
										type="text"
										value={verifyCode}
										onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
										placeholder="000000"
										className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-3xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										maxLength={6}
										autoFocus
									/>

									{enableMutation.isError && (
										<div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
											<AlertTriangle className="w-4 h-4 text-red-600" />
											<p className="text-sm text-red-700">
												Invalid code. Please try again.
											</p>
										</div>
									)}

									<div className="flex gap-3 mt-6">
										<button
											onClick={() => setStep('scan')}
											className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
										>
											<ChevronLeft className="w-4 h-4" />
											Back
										</button>
										<button
											onClick={handleVerify}
											disabled={verifyCode.length !== 6 || enableMutation.isPending}
											className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{enableMutation.isPending ? 'Verifying...' : 'Verify'}
										</button>
									</div>
								</motion.div>
							)}

							{step === 'backup' && setup && (
								<motion.div
									key="backup"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
								>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Save Backup Codes
									</h3>
									<p className="text-gray-500 mb-4">
										Store these codes securely. If you lose your authenticator, use these
										to access your account.
									</p>

									<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
										<div className="flex items-start gap-2">
											<AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
											<p className="text-sm text-amber-700">
												Each code can only be used once. Keep them safe and private.
											</p>
										</div>
									</div>

									<div className="bg-gray-50 rounded-lg p-4 mb-4">
										<div className="grid grid-cols-2 gap-2 font-mono text-sm">
											{setup.backupCodes.map((code, i) => (
												<div
													key={i}
													className="px-3 py-2 bg-white rounded border border-gray-200"
												>
													{code}
												</div>
											))}
										</div>
									</div>

									<div className="flex gap-2 mb-6">
										<button
											onClick={handleCopyBackupCodes}
											className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
										>
											{copiedBackup ? (
												<Check className="w-4 h-4 text-emerald-600" />
											) : (
												<Copy className="w-4 h-4" />
											)}
											{copiedBackup ? 'Copied!' : 'Copy'}
										</button>
										<button
											onClick={handleDownloadBackupCodes}
											className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
										>
											<Download className="w-4 h-4" />
											Download
										</button>
									</div>

									<button
										onClick={() => setStep('complete')}
										className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
									>
										I&apos;ve Saved My Codes
									</button>
								</motion.div>
							)}

							{step === 'complete' && (
								<motion.div
									key="complete"
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									className="text-center"
								>
									<div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
										<Check className="w-8 h-8 text-emerald-600" />
									</div>
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										Two-Factor Authentication Enabled
									</h3>
									<p className="text-gray-500 mb-6">
										Your account is now protected with two-factor authentication.
										You&apos;ll need your authenticator app to sign in.
									</p>
									<button
										onClick={handleClose}
										className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
									>
										Done
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Footer */}
					<div className="px-6 pb-4">
						<StepIndicator current={stepNumber} total={5} />
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
