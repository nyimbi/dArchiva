// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, GitCompare, Loader2, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocVerListItem {
	id: string;
	number: number;
	short_description?: string;
}

interface DiffChunk {
	type: 'equal' | 'insert' | 'delete';
	words: string[];
}

interface VersionDiffResponse {
	version_a: number;
	version_b: number;
	additions: number;
	deletions: number;
	unchanged: number;
	diff: DiffChunk[];
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useVersionDiff(
	documentId: string,
	versionA: number | null,
	versionB: number | null,
) {
	return useQuery<VersionDiffResponse>({
		queryKey: ['version-diff', documentId, versionA, versionB],
		queryFn: async () => {
			const { data } = await apiClient.get<VersionDiffResponse>(
				`/documents/${documentId}/versions/diff`,
				{ params: { version_a: versionA, version_b: versionB } },
			);
			return data;
		},
		enabled: !!documentId && versionA !== null && versionB !== null,
	});
}

// ---------------------------------------------------------------------------
// Rendered diff — split into old (A) and new (B) word streams
// ---------------------------------------------------------------------------

function buildSides(chunks: DiffChunk[]): {
	oldWords: Array<{ text: string; type: 'equal' | 'delete' }>;
	newWords: Array<{ text: string; type: 'equal' | 'insert' }>;
} {
	const oldWords: Array<{ text: string; type: 'equal' | 'delete' }> = [];
	const newWords: Array<{ text: string; type: 'equal' | 'insert' }> = [];

	for (const chunk of chunks) {
		if (chunk.type === 'equal') {
			chunk.words.forEach((w) => {
				oldWords.push({ text: w, type: 'equal' });
				newWords.push({ text: w, type: 'equal' });
			});
		} else if (chunk.type === 'delete') {
			chunk.words.forEach((w) => oldWords.push({ text: w, type: 'delete' }));
		} else {
			chunk.words.forEach((w) => newWords.push({ text: w, type: 'insert' }));
		}
	}

	return { oldWords, newWords };
}

function WordStream({
	words,
}: {
	words: Array<{ text: string; type: 'equal' | 'insert' | 'delete' }>;
}) {
	return (
		<p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words select-text">
			{words.map((w, i) => {
				if (w.type === 'equal') {
					return <span key={i}>{w.text} </span>;
				}
				if (w.type === 'delete') {
					return (
						<span
							key={i}
							className="bg-red-900/60 text-red-300 rounded px-0.5 line-through"
						>
							{w.text}{' '}
						</span>
					);
				}
				return (
					<span
						key={i}
						className="bg-green-900/60 text-green-300 rounded px-0.5"
					>
						{w.text}{' '}
					</span>
				);
			})}
		</p>
	);
}

// ---------------------------------------------------------------------------
// Version list + Compare button
// ---------------------------------------------------------------------------

export function VersionHistoryWithCompare({
	documentId,
	versions,
	onCompare,
}: {
	documentId: string;
	versions: DocVerListItem[];
	onCompare: (versionA: number, versionB: number) => void;
}) {
	// Sort ascending so we can pair adjacent versions
	const sorted = [...versions].sort((a, b) => a.number - b.number);

	return (
		<div className="space-y-1 p-3">
			<h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
				Version history
			</h3>
			{sorted.map((ver, idx) => {
				const prev = idx > 0 ? sorted[idx - 1] : null;
				return (
					<div
						key={ver.id}
						className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/60 group"
					>
						<div className="flex items-center gap-2 min-w-0">
							<span className="text-xs font-mono text-brass-400 shrink-0">
								v{ver.number}
							</span>
							<span className="text-sm text-slate-300 truncate">
								{ver.short_description || '—'}
							</span>
						</div>
						{prev && (
							<button
								onClick={() => onCompare(prev.number, ver.number)}
								className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-slate-400 hover:text-brass-300 transition-all ml-2 shrink-0"
								title={`Compare v${prev.number} → v${ver.number}`}
							>
								<GitCompare className="w-3.5 h-3.5" />
								Compare
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main diff viewer panel
// ---------------------------------------------------------------------------

interface VersionDiffViewerProps {
	documentId: string;
	versionA: number;
	versionB: number;
	onClose: () => void;
}

export function VersionDiffViewer({
	documentId,
	versionA,
	versionB,
	onClose,
}: VersionDiffViewerProps) {
	const { data, isLoading, error } = useVersionDiff(documentId, versionA, versionB);

	return (
		<div className="flex flex-col h-full bg-slate-950">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 shrink-0">
				<div className="flex items-center gap-2">
					<GitCompare className="w-4 h-4 text-brass-400" />
					<span className="text-sm font-medium text-slate-200">
						Diff: v{versionA} → v{versionB}
					</span>
					{data && (
						<div className="flex items-center gap-3 ml-3 text-xs">
							<span className="text-green-400">+{data.additions}</span>
							<span className="text-red-400">−{data.deletions}</span>
							<span className="text-slate-500">{data.unchanged} unchanged</span>
						</div>
					)}
				</div>
				<button
					onClick={onClose}
					className="p-1 text-slate-500 hover:text-slate-200 transition-colors rounded"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Body */}
			<div className="flex-1 min-h-0 overflow-hidden">
				{isLoading && (
					<div className="h-full flex items-center justify-center">
						<Loader2 className="w-6 h-6 animate-spin text-brass-500" />
					</div>
				)}

				{error && (
					<div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
						<AlertCircle className="w-8 h-8 text-red-500/70" />
						<p className="text-sm">Failed to load diff</p>
					</div>
				)}

				{data && (() => {
					const { oldWords, newWords } = buildSides(data.diff);
					return (
						<div className="grid grid-cols-2 h-full divide-x divide-slate-800">
							{/* Left pane — version A (old) */}
							<div className="flex flex-col min-h-0">
								<div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 shrink-0">
									<span className="text-xs font-mono text-slate-500">v{versionA}</span>
								</div>
								<div className="flex-1 overflow-y-auto p-4">
									<WordStream words={oldWords} />
								</div>
							</div>

							{/* Right pane — version B (new) */}
							<div className="flex flex-col min-h-0">
								<div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800 shrink-0">
									<span className="text-xs font-mono text-slate-500">v{versionB}</span>
								</div>
								<div className="flex-1 overflow-y-auto p-4">
									<WordStream words={newWords} />
								</div>
							</div>
						</div>
					);
				})()}
			</div>
		</div>
	);
}
