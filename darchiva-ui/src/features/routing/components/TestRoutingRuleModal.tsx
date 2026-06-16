// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import type { RoutingRule } from '@/types';
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	rule: RoutingRule;
}

interface TestResult {
	matched: boolean;
	destination: { type: string; id: string; name: string } | null;
	matchedRules: RoutingRule[];
}

export function TestRoutingRuleModal({ onClose, rule }: Props) {
	const [documentType, setDocumentType] = useState('');
	const [tags, setTags] = useState('');
	const [mode, setMode] = useState<'operational' | 'archival'>('operational');
	const [result, setResult] = useState<TestResult | null>(null);
	const [testing, setTesting] = useState(false);

	const handleTest = async () => {
		setTesting(true);
		try {
			const { data } = await apiClient.post<TestResult>('/routing/test', {
				documentType: documentType || undefined,
				tags: tags ? tags.split(',').map((t) => t.trim()) : [],
				mode,
			});
			setResult(data);
		} catch {
			toast.error('Test failed');
		} finally {
			setTesting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-slate-100">Test Rule: <span className="text-brass-400">{rule.name}</span></h2>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded">
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400 mb-1">Document Type</label>
						<input className="input w-full" placeholder="e.g. invoice, contract" value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
						<input className="input w-full" placeholder="e.g. urgent, legal" value={tags} onChange={(e) => setTags(e.target.value)} />
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Mode</label>
						<select className="input w-full" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
							<option value="operational">Operational</option>
							<option value="archival">Archival</option>
						</select>
					</div>

					{result && (
						<div className={`p-4 rounded-lg border ${result.matched ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
							<div className="flex items-center gap-2 mb-2">
								{result.matched
									? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
									: <XCircle className="w-5 h-5 text-red-400" />}
								<span className="font-medium text-slate-200">
									{result.matched ? 'Rule matched' : 'No match'}
								</span>
							</div>
							{result.matched && result.destination && (
								<p className="text-sm text-slate-400">
									Routes to: <span className="text-slate-200">{result.destination.name}</span> ({result.destination.type})
								</p>
							)}
						</div>
					)}

					<div className="flex gap-2">
						<button onClick={onClose} className="btn-secondary flex-1">Close</button>
						<button onClick={handleTest} disabled={testing} className="btn-primary flex-1">
							{testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run Test'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
