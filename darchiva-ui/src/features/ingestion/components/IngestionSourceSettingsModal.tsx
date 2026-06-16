// (c) Copyright Datacraft, 2026
import { useUpdateSource, type IngestionSource } from '@/features/ingestion/api';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	source: IngestionSource;
}

export function IngestionSourceSettingsModal({ onClose, source }: Props) {
	const [name, setName] = useState(source.name);
	const [isActive, setIsActive] = useState(source.isActive);
	const [config, setConfig] = useState<Record<string, string>>(
		Object.fromEntries(Object.entries(source.config).map(([k, v]) => [k, String(v)]))
	);

	const updateSource = useUpdateSource();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await updateSource.mutateAsync({ id: source.id, data: { name: name.trim(), isActive, config } });
			toast.success('Source settings saved');
			onClose();
		} catch {
			toast.error('Failed to save settings');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-lg font-semibold text-slate-100">Source Settings</h2>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400 mb-1">Name</label>
						<input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
					</div>

					<div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
						<div>
							<p className="text-sm text-slate-200">Active</p>
							<p className="text-xs text-slate-500">Enable or pause this source</p>
						</div>
						<button
							type="button"
							onClick={() => setIsActive(!isActive)}
							className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
						>
							<span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
						</button>
					</div>

					{Object.keys(config).length > 0 && (
						<div className="space-y-3">
							<p className="text-sm font-medium text-slate-300">Configuration</p>
							{Object.entries(config).map(([key, value]) => (
								<div key={key}>
									<label className="block text-xs text-slate-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
									<input
										className="input w-full text-sm"
										type={key.includes('password') || key.includes('secret') || key.includes('key') ? 'password' : 'text'}
										value={value}
										onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
									/>
								</div>
							))}
						</div>
					)}

					<div className="flex gap-2 pt-1">
						<button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
						<button type="submit" disabled={updateSource.isPending} className="btn-primary flex-1">
							{updateSource.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Settings'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
