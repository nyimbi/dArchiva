// (c) Copyright Datacraft, 2026
import { type EncryptedDocument } from '@/features/encryption/api';
import { formatRelativeTime } from '@/lib/utils';
import { Eye, Key, Lock, Shield, X } from 'lucide-react';

interface Props {
	onClose: () => void;
	doc: EncryptedDocument;
}

export function ViewEncryptedDocumentModal({ onClose, doc }: Props) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-5">
					<div className="flex items-center gap-2">
						<Lock className="w-5 h-5 text-brass-400" />
						<h2 className="text-lg font-semibold text-slate-100">Encrypted Document</h2>
					</div>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<div className="space-y-4">
					<div className="p-4 bg-slate-800/40 rounded-lg">
						<p className="text-base font-medium text-slate-200 mb-1">{doc.title}</p>
						<p className="text-xs text-slate-500">Document ID: {doc.id}</p>
					</div>

					<div className="space-y-3">
						{[
							{ icon: Key, label: 'Encryption Key Version', value: `v${doc.keyVersion}` },
							{ icon: Shield, label: 'Encrypted At', value: formatRelativeTime(doc.encryptedAt) },
							{ icon: Eye, label: 'Access Count', value: doc.accessCount.toString() },
							...(doc.lastAccessedAt ? [{ icon: Eye, label: 'Last Accessed', value: formatRelativeTime(doc.lastAccessedAt) }] : []),
						].map(({ icon: Icon, label, value }) => (
							<div key={label} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
								<div className="flex items-center gap-2 text-sm text-slate-400">
									<Icon className="w-4 h-4" />
									{label}
								</div>
								<span className="text-sm text-slate-200 font-mono">{value}</span>
							</div>
						))}
					</div>

					<div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
						<p className="text-xs text-amber-400">
							This document is encrypted at rest. Decryption requires active access permission and matching key version.
						</p>
					</div>
				</div>

				<button onClick={onClose} className="btn-secondary w-full mt-5">Close</button>
			</div>
		</div>
	);
}
