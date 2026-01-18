// (c) Copyright Datacraft, 2026
/**
 * Multi-factor authentication settings panel.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Shield,
	Smartphone,
	Key,
	Copy,
	Check,
	AlertTriangle,
	Plus,
	Trash2,
	Edit2,
	RefreshCw,
	ChevronRight,
	X,
	CheckCircle,
} from 'lucide-react';
import {
	useMFAStatus,
	useTOTPSetup,
	useEnableTOTP,
	useDisableTOTP,
	usePasskeys,
	useDeletePasskey,
	useRegenerateBackupCodes,
} from '../api';
import type { Passkey } from '../types';
import { TOTPSetupDialog } from './TOTPSetupDialog';
import { PasskeySetupDialog } from './PasskeySetupDialog';

function StatusBadge({ enabled }: { enabled: boolean }) {
	return (
		<span
			className={`px-2 py-1 text-xs font-medium rounded-full ${
				enabled
					? 'bg-emerald-100 text-emerald-700'
					: 'bg-gray-100 text-gray-600'
			}`}
		>
			{enabled ? 'Enabled' : 'Disabled'}
		</span>
	);
}

function PasskeyCard({
	passkey,
	onDelete,
}: {
	passkey: Passkey;
	onDelete: (id: string) => void;
}) {
	const [showConfirm, setShowConfirm] = useState(false);

	return (
		<div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-blue-100 rounded-lg">
					<Key className="w-5 h-5 text-blue-600" />
				</div>
				<div>
					<p className="font-medium text-gray-900">{passkey.name}</p>
					<p className="text-sm text-gray-500">
						Added {new Date(passkey.createdAt).toLocaleDateString()}
						{passkey.lastUsedAt && (
							<> • Last used {new Date(passkey.lastUsedAt).toLocaleDateString()}</>
						)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{showConfirm ? (
					<>
						<span className="text-sm text-red-600 mr-2">Delete?</span>
						<button
							onClick={() => onDelete(passkey.id)}
							className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
						>
							<Check className="w-4 h-4" />
						</button>
						<button
							onClick={() => setShowConfirm(false)}
							className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</>
				) : (
					<button
						onClick={() => setShowConfirm(true)}
						className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}

function BackupCodesSection({
	remaining,
	onRegenerate,
}: {
	remaining: number;
	onRegenerate: () => void;
}) {
	const isLow = remaining <= 3;
	const isEmpty = remaining === 0;

	return (
		<div className="bg-white border border-gray-200 rounded-xl p-6">
			<div className="flex items-start justify-between mb-4">
				<div>
					<h3 className="font-semibold text-gray-900">Backup Codes</h3>
					<p className="text-sm text-gray-500 mt-1">
						Use these codes if you lose access to your authenticator
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={`px-2 py-1 text-xs font-medium rounded-full ${
							isEmpty
								? 'bg-red-100 text-red-700'
								: isLow
									? 'bg-amber-100 text-amber-700'
									: 'bg-gray-100 text-gray-700'
						}`}
					>
						{remaining} remaining
					</span>
				</div>
			</div>

			{isEmpty && (
				<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
					<AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
					<p className="text-sm text-red-700">
						No backup codes remaining. Generate new codes immediately.
					</p>
				</div>
			)}

			{isLow && !isEmpty && (
				<div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
					<AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
					<p className="text-sm text-amber-700">
						Running low on backup codes. Consider generating new ones.
					</p>
				</div>
			)}

			<button
				onClick={onRegenerate}
				className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
			>
				<RefreshCw className="w-4 h-4" />
				Regenerate Backup Codes
			</button>
		</div>
	);
}

export function MFASettings() {
	const [showTOTPSetup, setShowTOTPSetup] = useState(false);
	const [showPasskeySetup, setShowPasskeySetup] = useState(false);
	const [showDisableTOTP, setShowDisableTOTP] = useState(false);
	const [disableCode, setDisableCode] = useState('');
	const [regenerateCode, setRegenerateCode] = useState('');
	const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
	const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

	const { data: status, isLoading: statusLoading } = useMFAStatus();
	const { data: passkeysData, isLoading: passkeysLoading } = usePasskeys();
	const deletePasskeyMutation = useDeletePasskey();
	const disableTOTPMutation = useDisableTOTP();
	const regenerateCodesMutation = useRegenerateBackupCodes();

	const handleDeletePasskey = async (passkeyId: string) => {
		await deletePasskeyMutation.mutateAsync({ passkeyId });
	};

	const handleDisableTOTP = async () => {
		try {
			await disableTOTPMutation.mutateAsync({ code: disableCode });
			setShowDisableTOTP(false);
			setDisableCode('');
		} catch (e) {
			// Error handled by mutation
		}
	};

	const handleRegenerateBackupCodes = async () => {
		try {
			const result = await regenerateCodesMutation.mutateAsync({ code: regenerateCode });
			setNewBackupCodes(result.codes);
			setRegenerateCode('');
		} catch (e) {
			// Error handled by mutation
		}
	};

	if (statusLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="p-3 bg-blue-100 rounded-xl">
					<Shield className="w-6 h-6 text-blue-600" />
				</div>
				<div>
					<h1 className="text-xl font-bold text-gray-900">
						Two-Factor Authentication
					</h1>
					<p className="text-gray-500">
						Add an extra layer of security to your account
					</p>
				</div>
			</div>

			{/* TOTP Section */}
			<div className="bg-white border border-gray-200 rounded-xl p-6">
				<div className="flex items-start justify-between">
					<div className="flex items-start gap-4">
						<div className="p-2 bg-purple-100 rounded-lg mt-1">
							<Smartphone className="w-5 h-5 text-purple-600" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-gray-900">
									Authenticator App
								</h3>
								<StatusBadge enabled={status?.totpEnabled || false} />
							</div>
							<p className="text-sm text-gray-500 mt-1">
								Use an authenticator app like Google Authenticator, Authy, or
								1Password to generate verification codes.
							</p>
						</div>
					</div>

					{status?.totpEnabled ? (
						<button
							onClick={() => setShowDisableTOTP(true)}
							className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
						>
							Disable
						</button>
					) : (
						<button
							onClick={() => setShowTOTPSetup(true)}
							className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<Plus className="w-4 h-4" />
							Setup
						</button>
					)}
				</div>
			</div>

			{/* Passkeys Section */}
			<div className="bg-white border border-gray-200 rounded-xl p-6">
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-start gap-4">
						<div className="p-2 bg-blue-100 rounded-lg mt-1">
							<Key className="w-5 h-5 text-blue-600" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-gray-900">Passkeys</h3>
								<StatusBadge enabled={status?.webauthnEnabled || false} />
							</div>
							<p className="text-sm text-gray-500 mt-1">
								Use biometrics (fingerprint, face) or hardware security keys for
								passwordless authentication.
							</p>
						</div>
					</div>
					<button
						onClick={() => setShowPasskeySetup(true)}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add Passkey
					</button>
				</div>

				{passkeysLoading ? (
					<div className="space-y-2">
						{[1, 2].map((i) => (
							<div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
						))}
					</div>
				) : passkeysData?.passkeys && passkeysData.passkeys.length > 0 ? (
					<div className="space-y-2">
						{passkeysData.passkeys.map((passkey) => (
							<PasskeyCard
								key={passkey.id}
								passkey={passkey}
								onDelete={handleDeletePasskey}
							/>
						))}
					</div>
				) : (
					<div className="text-center py-6 text-gray-400">
						<Key className="w-10 h-10 mx-auto mb-2 opacity-50" />
						<p>No passkeys registered yet</p>
					</div>
				)}
			</div>

			{/* Backup Codes Section */}
			{status?.totpEnabled && (
				<BackupCodesSection
					remaining={status.backupCodesRemaining}
					onRegenerate={() => setShowRegenerateDialog(true)}
				/>
			)}

			{/* Dialogs */}
			<TOTPSetupDialog
				isOpen={showTOTPSetup}
				onClose={() => setShowTOTPSetup(false)}
			/>

			<PasskeySetupDialog
				isOpen={showPasskeySetup}
				onClose={() => setShowPasskeySetup(false)}
			/>

			{/* Disable TOTP Dialog */}
			<AnimatePresence>
				{showDisableTOTP && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
						onClick={() => setShowDisableTOTP(false)}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Disable Authenticator App
							</h3>
							<p className="text-gray-500 mb-4">
								Enter your current TOTP code to disable two-factor authentication.
							</p>

							<input
								type="text"
								value={disableCode}
								onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
								placeholder="Enter 6-digit code"
								className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
								maxLength={6}
							/>

							<div className="flex justify-end gap-3 mt-6">
								<button
									onClick={() => setShowDisableTOTP(false)}
									className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleDisableTOTP}
									disabled={disableCode.length !== 6 || disableTOTPMutation.isPending}
									className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{disableTOTPMutation.isPending ? 'Disabling...' : 'Disable'}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Regenerate Backup Codes Dialog */}
			<AnimatePresence>
				{showRegenerateDialog && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
						onClick={() => {
							setShowRegenerateDialog(false);
							setNewBackupCodes(null);
						}}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
							onClick={(e) => e.stopPropagation()}
						>
							{newBackupCodes ? (
								<>
									<div className="flex items-center gap-2 mb-4">
										<CheckCircle className="w-6 h-6 text-emerald-600" />
										<h3 className="text-lg font-semibold text-gray-900">
											New Backup Codes Generated
										</h3>
									</div>
									<p className="text-gray-500 mb-4">
										Save these codes in a secure location. Each code can only be used once.
									</p>
									<div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
										{newBackupCodes.map((code, i) => (
											<div key={i} className="p-2 bg-white rounded border border-gray-200">
												{code}
											</div>
										))}
									</div>
									<button
										onClick={() => {
											setShowRegenerateDialog(false);
											setNewBackupCodes(null);
										}}
										className="w-full mt-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										Done
									</button>
								</>
							) : (
								<>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Regenerate Backup Codes
									</h3>
									<p className="text-gray-500 mb-4">
										This will invalidate all existing backup codes. Enter your TOTP code to continue.
									</p>

									<input
										type="text"
										value={regenerateCode}
										onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
										placeholder="Enter 6-digit code"
										className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										maxLength={6}
									/>

									<div className="flex justify-end gap-3 mt-6">
										<button
											onClick={() => setShowRegenerateDialog(false)}
											className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
										>
											Cancel
										</button>
										<button
											onClick={handleRegenerateBackupCodes}
											disabled={regenerateCode.length !== 6 || regenerateCodesMutation.isPending}
											className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{regenerateCodesMutation.isPending ? 'Generating...' : 'Regenerate'}
										</button>
									</div>
								</>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
