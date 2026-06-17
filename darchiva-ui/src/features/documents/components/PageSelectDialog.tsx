// PageSelectDialog — select specific pages of a document for download.
//
// Features:
//   • Checkbox grid of page numbers (1..pageCount)
//   • Quick-select: All, None, Odd, Even
//   • Free-text page range input ("1-3, 5, 8-10") that merges into the grid
//   • Download Selected → builds ?pages=… URL, triggers download
//
// Usage:
//   <PageSelectDialog
//     open={open}
//     documentId={id}
//     documentTitle={title}
//     pageCount={n}
//     onClose={() => setOpen(false)}
//   />

import { useState, useMemo, useCallback } from 'react';
import { Download, X, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
	open: boolean;
	documentId: string;
	documentTitle: string;
	pageCount: number;
	onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = '/api/v1';

/**
 * Parse a page range string like "1-3, 5, 8-10" into a set of 1-based page
 * numbers. Returns null if the string contains invalid tokens.
 */
function parseRangeString(raw: string, max: number): Set<number> | null {
	const result = new Set<number>();
	const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
	for (const part of parts) {
		if (/^\d+$/.test(part)) {
			const n = parseInt(part, 10);
			if (n < 1 || n > max) return null;
			result.add(n);
		} else if (/^\d+-\d+$/.test(part)) {
			const [a, b] = part.split('-').map(Number);
			if (a > b || a < 1 || b > max) return null;
			for (let i = a; i <= b; i++) result.add(i);
		} else {
			return null;
		}
	}
	return result;
}

/**
 * Serialise a sorted list of page numbers into a compact range string
 * for the API query param, e.g. [1,2,3,5,8,9] → "1-3,5,8-9".
 */
function serialisePages(pages: number[]): string {
	if (pages.length === 0) return '';
	const sorted = [...pages].sort((a, b) => a - b);
	const ranges: string[] = [];
	let start = sorted[0];
	let end = sorted[0];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === end + 1) {
			end = sorted[i];
		} else {
			ranges.push(start === end ? `${start}` : `${start}-${end}`);
			start = sorted[i];
			end = sorted[i];
		}
	}
	ranges.push(start === end ? `${start}` : `${start}-${end}`);
	return ranges.join(',');
}

function triggerDownload(url: string) {
	const a = document.createElement('a');
	a.href = url;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

// ---------------------------------------------------------------------------
// PageSelectDialog
// ---------------------------------------------------------------------------

export function PageSelectDialog({
	open,
	documentId,
	documentTitle,
	pageCount,
	onClose,
}: Props) {
	const allPages = useMemo(
		() => Array.from({ length: pageCount }, (_, i) => i + 1),
		[pageCount],
	);

	const [selected, setSelected] = useState<Set<number>>(() => new Set(allPages));
	const [rangeInput, setRangeInput] = useState('');
	const [rangeError, setRangeError] = useState('');

	// ── Toggle individual page ──────────────────────────────────────────────

	const toggle = useCallback((page: number) => {
		setSelected(prev => {
			const next = new Set(prev);
			if (next.has(page)) next.delete(page);
			else next.add(page);
			return next;
		});
	}, []);

	// ── Quick-select ────────────────────────────────────────────────────────

	const selectAll  = () => setSelected(new Set(allPages));
	const selectNone = () => setSelected(new Set());
	const selectOdd  = () => setSelected(new Set(allPages.filter(p => p % 2 !== 0)));
	const selectEven = () => setSelected(new Set(allPages.filter(p => p % 2 === 0)));

	// ── Range input apply ───────────────────────────────────────────────────

	const applyRange = () => {
		if (!rangeInput.trim()) return;
		const parsed = parseRangeString(rangeInput, pageCount);
		if (!parsed) {
			setRangeError(`Invalid range. Use "1-3, 5, 8-10" (1–${pageCount}).`);
			return;
		}
		setRangeError('');
		setSelected(parsed);
		setRangeInput('');
	};

	const handleRangeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') applyRange();
	};

	// ── Download ────────────────────────────────────────────────────────────

	const handleDownload = () => {
		if (selected.size === 0) return;
		const pagesParam = serialisePages([...selected]);
		const url = `${API_BASE}/documents/${documentId}/download/pages?pages=${encodeURIComponent(pagesParam)}`;
		triggerDownload(url);
		onClose();
	};

	if (!open) return null;

	// Layout constants
	const COLS = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(pageCount))));

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Panel */}
			<div className="doc-modal relative z-10 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
				<div className="p-6 flex flex-col gap-4 overflow-hidden">

					{/* ── Header ── */}
					<div className="flex items-center gap-3 flex-shrink-0">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--doc-accent)]/10">
							<Layers className="w-5 h-5 text-[var(--doc-accent)]" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="font-display text-lg font-semibold text-[var(--doc-text)]">
								Select Pages
							</h3>
							<p className="text-sm text-[var(--doc-muted)] truncate">
								{documentTitle}
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-[var(--doc-muted)] hover:text-[var(--doc-text)] transition-colors flex-shrink-0"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* ── Quick-select row ── */}
					<div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
						<span className="text-xs text-[var(--doc-muted)] mr-1">Quick:</span>
						{[
							{ label: 'All',  action: selectAll  },
							{ label: 'None', action: selectNone },
							{ label: 'Odd',  action: selectOdd  },
							{ label: 'Even', action: selectEven },
						].map(({ label, action }) => (
							<button
								key={label}
								onClick={action}
								className="px-2.5 py-1 rounded-md text-xs font-medium
									border border-[var(--doc-border)] bg-[var(--doc-surface)]
									text-[var(--doc-text)] hover:bg-[var(--doc-surface-hover)]
									transition-colors"
							>
								{label}
							</button>
						))}
						<span className="ml-auto text-xs text-[var(--doc-muted)]">
							{selected.size} / {pageCount} selected
						</span>
					</div>

					{/* ── Page checkbox grid ── */}
					<div
						className="overflow-y-auto flex-1 rounded-lg border border-[var(--doc-border)]
							bg-[var(--doc-surface)] p-3"
						style={{ maxHeight: '280px' }}
					>
						<div
							className="grid gap-1.5"
							style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
						>
							{allPages.map(page => {
								const isSelected = selected.has(page);
								return (
									<button
										key={page}
										onClick={() => toggle(page)}
										aria-pressed={isSelected}
										className={`
											aspect-square flex items-center justify-center
											rounded-md text-xs font-medium border
											transition-colors select-none
											${isSelected
												? 'bg-[var(--doc-accent)] border-[var(--doc-accent)] text-white'
												: 'bg-[var(--doc-bg)] border-[var(--doc-border)] text-[var(--doc-muted)] hover:border-[var(--doc-accent)] hover:text-[var(--doc-text)]'
											}
										`}
									>
										{page}
									</button>
								);
							})}
						</div>
					</div>

					{/* ── Range input ── */}
					<div className="flex-shrink-0">
						<label className="block text-xs font-medium text-[var(--doc-text)] mb-1.5">
							Page range{' '}
							<span className="text-[var(--doc-muted)] font-normal">
								(e.g. "1-3, 5, 8-10") — replaces current selection
							</span>
						</label>
						<div className="flex gap-2">
							<Input
								value={rangeInput}
								onChange={e => { setRangeInput(e.target.value); setRangeError(''); }}
								onKeyDown={handleRangeKeyDown}
								placeholder={`1-${Math.min(3, pageCount)}, 5, 8-10`}
								className="doc-input text-sm flex-1"
							/>
							<Button
								variant="outline"
								size="sm"
								onClick={applyRange}
								className="flex-shrink-0 border-[var(--doc-border)] text-[var(--doc-text)]"
							>
								Apply
							</Button>
						</div>
						{rangeError && (
							<p className="mt-1 text-xs text-red-500 dark:text-red-400">
								{rangeError}
							</p>
						)}
					</div>

					{/* ── Actions ── */}
					<div className="flex items-center justify-end gap-3 flex-shrink-0 pt-1">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							onClick={handleDownload}
							disabled={selected.size === 0}
							className="bg-[var(--doc-accent)] hover:bg-[var(--doc-accent)]/90 text-white border-0"
						>
							<Download className="w-4 h-4 mr-2" />
							Download {selected.size} {selected.size === 1 ? 'Page' : 'Pages'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
