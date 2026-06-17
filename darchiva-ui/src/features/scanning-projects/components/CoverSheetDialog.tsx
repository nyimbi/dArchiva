// (c) Copyright Datacraft, 2026
import * as Dialog from '@radix-ui/react-dialog';
import { Download, Printer, X } from 'lucide-react';
import { useState } from 'react';

const API_BASE = '/api/v1';

interface CoverSheetDialogProps {
	projectId: string;
	projectName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type SheetMode = 'cover' | 'separator';

export function CoverSheetDialog({
	projectId,
	projectName,
	open,
	onOpenChange,
}: CoverSheetDialogProps) {
	const [mode, setMode] = useState<SheetMode>('cover');
	const [batchCount, setBatchCount] = useState(1);

	function handleDownload() {
		let url: string;
		if (mode === 'cover') {
			url = `${API_BASE}/scanning-projects/${projectId}/cover-sheet?batch_count=${batchCount}`;
		} else {
			url = `${API_BASE}/scanning-projects/${projectId}/separator-sheet`;
		}
		window.open(url, '_blank');
		onOpenChange(false);
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-xl z-50">
					<div className="flex items-center justify-between mb-5">
						<Dialog.Title className="text-base font-semibold text-slate-100 flex items-center gap-2">
							<Printer className="w-4 h-4 text-brass-400" />
							Print Sheets
						</Dialog.Title>
						<Dialog.Close className="text-slate-500 hover:text-slate-300 transition-colors">
							<X className="w-4 h-4" />
						</Dialog.Close>
					</div>

					{/* Mode toggle */}
					<div className="flex rounded-lg overflow-hidden border border-slate-700 mb-5">
						{(['cover', 'separator'] as const).map((m) => (
							<button
								key={m}
								onClick={() => setMode(m)}
								className={`flex-1 py-2 text-sm font-medium transition-colors ${
									mode === m
										? 'bg-brass-500 text-slate-900'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'
								}`}
							>
								{m === 'cover' ? 'Cover Sheets' : 'Separator Sheets'}
							</button>
						))}
					</div>

					{/* Project name preview */}
					<div className="bg-slate-800/60 rounded-lg px-4 py-3 mb-4 text-sm text-slate-300">
						<span className="text-slate-500 text-xs uppercase tracking-wide block mb-1">Project</span>
						{projectName}
					</div>

					{mode === 'cover' && (
						<div className="mb-5">
							<label className="block text-sm text-slate-400 mb-2">
								How many batches?
							</label>
							<input
								type="number"
								min={1}
								max={20}
								value={batchCount}
								onChange={(e) => setBatchCount(Math.max(1, Math.min(20, Number(e.target.value))))}
								className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-brass-500"
							/>
							<p className="text-xs text-slate-500 mt-1.5">
								Generates {batchCount} page{batchCount !== 1 ? 's' : ''} — one cover sheet per batch
							</p>
						</div>
					)}

					{mode === 'separator' && (
						<div className="mb-5 text-sm text-slate-400 bg-slate-800/40 rounded-lg px-4 py-3">
							A single A5 separator sheet. Place between document stacks to trigger auto-split during scanning.
						</div>
					)}

					<p className="text-xs text-slate-500 mb-5">
						Each sheet will be printed on {mode === 'cover' ? 'A4' : 'A5'} paper.
					</p>

					<button
						onClick={handleDownload}
						className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brass-500 hover:bg-brass-400 text-slate-900 font-medium rounded-lg text-sm transition-colors"
					>
						<Download className="w-4 h-4" />
						Download &amp; Print
					</button>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
