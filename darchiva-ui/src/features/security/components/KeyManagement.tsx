// (c) Copyright Datacraft, 2026
/**
 * Encryption key management with rotation controls.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, RefreshCw, Shield, Clock, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import type { EncryptionKey } from '../types';
import { fetchEncryptionKeys, rotateEncryptionKey } from '../api';

interface KeyCardProps {
	keyData: EncryptionKey;
	isActive: boolean;
}

function KeyCard({ keyData, isActive }: KeyCardProps) {
	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className={`relative overflow-hidden rounded-xl border-2 p-5 transition-shadow ${
				isActive
					? 'border-sage/50 bg-sage/5 shadow-md'
					: 'border-charcoal/10 bg-parchment'
			}`}
		>
			{isActive && (
				<div className="absolute -right-8 -top-8 h-20 w-20 rotate-45 bg-gradient-to-br from-sage/20 to-transparent" />
			)}

			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div className={`rounded-lg p-2 ${isActive ? 'bg-sage/20' : 'bg-charcoal/5'}`}>
						<Key className={`h-5 w-5 ${isActive ? 'text-sage' : 'text-charcoal/40'}`} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="font-['Newsreader'] text-lg font-semibold text-charcoal">
								Version {keyData.key_version}
							</span>
							{isActive && (
								<span className="rounded-full bg-sage px-2 py-0.5 font-['DM_Sans'] text-xs font-medium text-cream">
									Active
								</span>
							)}
						</div>
						<p className="mt-0.5 font-['DM_Sans'] text-sm text-charcoal/50">
							KEK-{keyData.id.slice(0, 8)}
						</p>
					</div>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-3 gap-4 border-t border-charcoal/10 pt-4">
				<div>
					<p className="font-['DM_Sans'] text-xs uppercase tracking-wider text-charcoal/40">
						Created
					</p>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal">
						{formatDate(keyData.created_at)}
					</p>
				</div>
				<div>
					<p className="font-['DM_Sans'] text-xs uppercase tracking-wider text-charcoal/40">
						Rotated
					</p>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal">
						{formatDate(keyData.rotated_at)}
					</p>
				</div>
				<div>
					<p className="font-['DM_Sans'] text-xs uppercase tracking-wider text-charcoal/40">
						Expires
					</p>
					<p className={`mt-1 font-['DM_Sans'] text-sm ${
						keyData.expires_at && new Date(keyData.expires_at) < new Date()
							? 'text-terracotta'
							: 'text-charcoal'
					}`}>
						{formatDate(keyData.expires_at)}
					</p>
				</div>
			</div>
		</motion.div>
	);
}

export function KeyManagement() {
	const [keys, setKeys] = useState<EncryptionKey[]>([]);
	const [activeVersion, setActiveVersion] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [rotating, setRotating] = useState(false);
	const [rotateExpireDays, setRotateExpireDays] = useState(30);
	const [showRotateModal, setShowRotateModal] = useState(false);

	const loadKeys = async () => {
		try {
			const data = await fetchEncryptionKeys();
			setKeys(data.items);
			setActiveVersion(data.active_version);
		} catch (err) {
			console.error('Failed to load keys:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadKeys();
	}, []);

	const handleRotate = async () => {
		setRotating(true);
		try {
			const result = await rotateEncryptionKey(rotateExpireDays);
			if (result.success) {
				await loadKeys();
				setShowRotateModal(false);
			}
		} catch (err) {
			console.error('Failed to rotate key:', err);
		} finally {
			setRotating(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<div className="h-32 animate-pulse rounded-xl bg-parchment" />
				<div className="h-32 animate-pulse rounded-xl bg-parchment" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="rounded-lg bg-charcoal/5 p-2">
						<Lock className="h-5 w-5 text-charcoal/60" />
					</div>
					<div>
						<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
							Encryption Keys
						</h2>
						<p className="font-['DM_Sans'] text-sm text-charcoal/50">
							Manage tenant key encryption keys (KEK)
						</p>
					</div>
				</div>

				<button
					onClick={() => setShowRotateModal(true)}
					className="flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-charcoal/90"
				>
					<RefreshCw className="h-4 w-4" /> Rotate Key
				</button>
			</div>

			{/* Info Banner */}
			<div className="flex items-start gap-3 rounded-xl bg-gold/10 p-4">
				<AlertTriangle className="h-5 w-5 flex-shrink-0 text-gold" />
				<div>
					<p className="font-['DM_Sans'] text-sm font-medium text-charcoal">
						Key Rotation Best Practices
					</p>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/70">
						Rotate encryption keys periodically (e.g., every 90 days) to maintain security.
						Old keys remain valid until their expiration to allow decryption of existing documents.
					</p>
				</div>
			</div>

			{/* Keys List */}
			{keys.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border-2 border-charcoal/10 bg-parchment py-12 text-center">
					<Key className="h-12 w-12 text-charcoal/20" />
					<h3 className="mt-4 font-['Newsreader'] text-lg font-semibold text-charcoal">
						No Encryption Keys
					</h3>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/50">
						Create your first encryption key to enable document encryption
					</p>
				</div>
			) : (
				<div className="grid gap-4 lg:grid-cols-2">
					{keys.map(key => (
						<KeyCard
							key={key.id}
							keyData={key}
							isActive={key.key_version === activeVersion}
						/>
					))}
				</div>
			)}

			{/* Rotate Modal */}
			<AnimatePresence>
				{showRotateModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm"
					>
						<motion.div
							initial={{ scale: 0.95 }}
							animate={{ scale: 1 }}
							exit={{ scale: 0.95 }}
							className="w-full max-w-md rounded-2xl border-2 border-charcoal/10 bg-cream p-6 shadow-2xl"
						>
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-gold/15 p-2">
									<RefreshCw className="h-5 w-5 text-gold" />
								</div>
								<h3 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
									Rotate Encryption Key
								</h3>
							</div>

							<p className="mt-4 font-['DM_Sans'] text-sm text-charcoal/70">
								A new Key Encryption Key (KEK) will be created and set as active.
								The current key will remain valid for decryption until it expires.
							</p>

							<div className="mt-4">
								<label className="block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
									Expire old key in (days)
								</label>
								<input
									type="number"
									value={rotateExpireDays}
									onChange={(e) => setRotateExpireDays(Number(e.target.value))}
									min={1}
									max={365}
									className="mt-1 w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2 font-['DM_Sans'] text-charcoal focus:border-charcoal/30 focus:outline-none"
								/>
							</div>

							<div className="mt-6 flex justify-end gap-3">
								<button
									onClick={() => setShowRotateModal(false)}
									className="rounded-lg px-4 py-2 font-['DM_Sans'] text-sm font-medium text-charcoal/60 transition-colors hover:bg-charcoal/5"
								>
									Cancel
								</button>
								<button
									onClick={handleRotate}
									disabled={rotating}
									className="flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-charcoal/90 disabled:opacity-50"
								>
									<RefreshCw className={`h-4 w-4 ${rotating ? 'animate-spin' : ''}`} />
									{rotating ? 'Rotating...' : 'Rotate Key'}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
