// DownloadMenu — dropdown for downloading / printing a document.
//
// Props:
//   documentId    string   — document UUID
//   documentTitle string   — used in filenames and dialog header
//   pageCount     number   — total page count (drives the page-select grid)
//
// Dropdown items:
//   • Download PDF          → GET /api/v1/documents/{id}/download
//   • Download Selected Pages → opens PageSelectDialog
//   • Download as Images (ZIP) → GET /api/v1/documents/{id}/download/images
//   • Print                 → opens /api/v1/documents/{id}/download in new tab
//                             (browser print dialog fires automatically via JS)

import { useState } from 'react';
import {
	Download,
	FileDown,
	ImageDown,
	Printer,
	ChevronDown,
	SlidersHorizontal,
} from 'lucide-react';
import { PageSelectDialog } from './PageSelectDialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
	documentId: string;
	documentTitle: string;
	pageCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = '/api/v1';

function triggerDownload(url: string) {
	const a = document.createElement('a');
	a.href = url;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function openPrint(documentId: string) {
	// Open the raw PDF in a new tab; the browser's built-in print dialog
	// fires automatically when the PDF viewer loads.
	const url = `${API_BASE}/documents/${documentId}/download`;
	const win = window.open(url, '_blank');
	if (win) {
		// Give the PDF a moment to load then invoke print
		win.addEventListener('load', () => {
			try { win.print(); } catch { /* some browsers block cross-origin print */ }
		});
	}
}

// ---------------------------------------------------------------------------
// DownloadMenu
// ---------------------------------------------------------------------------

export function DownloadMenu({ documentId, documentTitle, pageCount }: Props) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [pageSelectOpen, setPageSelectOpen] = useState(false);

	const handleDownloadPdf = () => {
		setMenuOpen(false);
		triggerDownload(`${API_BASE}/documents/${documentId}/download`);
	};

	const handleDownloadImages = () => {
		setMenuOpen(false);
		triggerDownload(`${API_BASE}/documents/${documentId}/download/images`);
	};

	const handlePrint = () => {
		setMenuOpen(false);
		openPrint(documentId);
	};

	const handleSelectPages = () => {
		setMenuOpen(false);
		setPageSelectOpen(true);
	};

	return (
		<>
			{/* ── Trigger button ── */}
			<div className="relative inline-block">
				<button
					onClick={() => setMenuOpen(prev => !prev)}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
						border border-[var(--doc-border)] bg-[var(--doc-surface)]
						text-sm text-[var(--doc-text)] hover:bg-[var(--doc-surface-hover)]
						transition-colors select-none"
					aria-haspopup="true"
					aria-expanded={menuOpen}
				>
					<Download className="w-4 h-4" />
					<span>Download</span>
					<ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
				</button>

				{/* ── Dropdown ── */}
				{menuOpen && (
					<>
						{/* backdrop — close on outside click */}
						<div
							className="fixed inset-0 z-40"
							onClick={() => setMenuOpen(false)}
						/>
						<div
							className="absolute right-0 mt-1.5 z-50 min-w-[220px]
								rounded-xl border border-[var(--doc-border)] bg-[var(--doc-bg)]
								shadow-xl shadow-black/20 overflow-hidden"
						>
							<div className="py-1">
								<MenuButton
									icon={<FileDown className="w-4 h-4" />}
									label="Download PDF"
									description="Full document"
									onClick={handleDownloadPdf}
								/>
								<MenuButton
									icon={<SlidersHorizontal className="w-4 h-4" />}
									label="Download Selected Pages"
									description="Choose specific pages"
									onClick={handleSelectPages}
								/>
								<MenuButton
									icon={<ImageDown className="w-4 h-4" />}
									label="Download as Images"
									description="ZIP archive of PNG pages"
									onClick={handleDownloadImages}
								/>
								<div className="mx-3 my-1 border-t border-[var(--doc-border)]" />
								<MenuButton
									icon={<Printer className="w-4 h-4" />}
									label="Print"
									description="Opens browser print dialog"
									onClick={handlePrint}
								/>
							</div>
						</div>
					</>
				)}
			</div>

			{/* ── Page select dialog ── */}
			<PageSelectDialog
				open={pageSelectOpen}
				documentId={documentId}
				documentTitle={documentTitle}
				pageCount={pageCount}
				onClose={() => setPageSelectOpen(false)}
			/>
		</>
	);
}

// ---------------------------------------------------------------------------
// MenuButton — reusable dropdown item
// ---------------------------------------------------------------------------

interface MenuButtonProps {
	icon: React.ReactNode;
	label: string;
	description: string;
	onClick: () => void;
}

function MenuButton({ icon, label, description, onClick }: MenuButtonProps) {
	return (
		<button
			onClick={onClick}
			className="w-full flex items-start gap-3 px-4 py-2.5
				text-left hover:bg-[var(--doc-surface)] transition-colors"
		>
			<span className="mt-0.5 text-[var(--doc-accent)] flex-shrink-0">{icon}</span>
			<span className="flex flex-col min-w-0">
				<span className="text-sm font-medium text-[var(--doc-text)] leading-snug">
					{label}
				</span>
				<span className="text-xs text-[var(--doc-muted)] leading-snug">
					{description}
				</span>
			</span>
		</button>
	);
}
