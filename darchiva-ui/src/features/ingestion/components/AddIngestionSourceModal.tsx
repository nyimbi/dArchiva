// (c) Copyright Datacraft, 2026
import { useCreateSource, type SourceType } from '@/features/ingestion/api';
import { FolderOpen, Globe, Loader2, Mail, ScanLine, Server, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
}

const SOURCE_TYPES: Array<{ value: SourceType; label: string; icon: React.ElementType; description: string }> = [
	{ value: 'folder_watch', label: 'Folder Watch', icon: FolderOpen, description: 'Monitor a local or network folder' },
	{ value: 'email', label: 'Email', icon: Mail, description: 'Ingest from IMAP/SMTP mailbox' },
	{ value: 'scanner', label: 'Scanner', icon: ScanLine, description: 'Direct scanner integration' },
	{ value: 'api', label: 'API', icon: Globe, description: 'External API push endpoint' },
	{ value: 'cloud_storage', label: 'Cloud Storage', icon: Server, description: 'S3, GCS, or Azure Blob' },
];

export function AddIngestionSourceModal({ onClose }: Props) {
	const [step, setStep] = useState<'type' | 'config'>('type');
	const [sourceType, setSourceType] = useState<SourceType | null>(null);
	const [name, setName] = useState('');
	const [config, setConfig] = useState<Record<string, string>>({});

	const createSource = useCreateSource();

	const CONFIG_FIELDS: Record<SourceType, Array<{ key: string; label: string; placeholder: string; type?: string }>> = {
		folder_watch: [{ key: 'path', label: 'Folder Path', placeholder: '/data/incoming' }],
		email: [
			{ key: 'host', label: 'IMAP Host', placeholder: 'mail.example.com' },
			{ key: 'port', label: 'Port', placeholder: '993', type: 'number' },
			{ key: 'username', label: 'Username', placeholder: 'user@example.com' },
			{ key: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
		],
		scanner: [{ key: 'scanner_url', label: 'Scanner URL', placeholder: 'http://192.168.1.100' }],
		api: [{ key: 'api_key', label: 'API Key (generated)', placeholder: 'auto-generated' }],
		cloud_storage: [
			{ key: 'bucket', label: 'Bucket Name', placeholder: 'my-bucket' },
			{ key: 'prefix', label: 'Key Prefix', placeholder: 'incoming/' },
			{ key: 'region', label: 'Region', placeholder: 'us-east-1' },
		],
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!sourceType || !name.trim()) return;
		try {
			await createSource.mutateAsync({ name: name.trim(), type: sourceType, config, isActive: true });
			toast.success('Ingestion source created');
			onClose();
		} catch {
			toast.error('Failed to create ingestion source');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-lg p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-lg font-semibold text-slate-100">Add Ingestion Source</h2>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				{step === 'type' ? (
					<div className="space-y-4">
						<p className="text-sm text-slate-400">Select the type of ingestion source:</p>
						<div className="grid grid-cols-1 gap-2">
							{SOURCE_TYPES.map(({ value, label, icon: Icon, description }) => (
								<button
									key={value}
									onClick={() => { setSourceType(value); setStep('config'); }}
									className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 hover:border-brass-500/50 hover:bg-brass-500/5 text-left transition-colors"
								>
									<div className="p-2 bg-slate-800 rounded-lg">
										<Icon className="w-5 h-5 text-slate-400" />
									</div>
									<div>
										<p className="text-sm font-medium text-slate-200">{label}</p>
										<p className="text-xs text-slate-500">{description}</p>
									</div>
								</button>
							))}
						</div>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm text-slate-400 mb-1">Source Name *</label>
							<input className="input w-full" placeholder="e.g. Legal inbox, Archive folder" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>
						{sourceType && CONFIG_FIELDS[sourceType].map(({ key, label, placeholder, type }) => (
							<div key={key}>
								<label className="block text-sm text-slate-400 mb-1">{label}</label>
								<input
									className="input w-full"
									type={type ?? 'text'}
									placeholder={placeholder}
									value={config[key] ?? ''}
									onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
								/>
							</div>
						))}
						<div className="flex gap-2 pt-1">
							<button type="button" onClick={() => setStep('type')} className="btn-secondary flex-1">Back</button>
							<button type="submit" disabled={createSource.isPending} className="btn-primary flex-1">
								{createSource.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Source'}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
