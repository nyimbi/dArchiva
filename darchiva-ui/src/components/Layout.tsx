// (c) Copyright Datacraft, 2026
import { CommandPalette } from '@/features/command-palette/CommandPalette';
import { useNotificationSocket } from '@/features/notifications/useNotificationSocket';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FilePlus2, FolderPlus, Plus, ScanLine, Search, Upload } from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { DropZoneOverlay } from './DropZoneOverlay';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { ModalManager } from './ModalManager';
import { PageSkeleton } from './PageSkeleton';
import { Sidebar } from './Sidebar';

export function Layout() {
	const { sidebarCollapsed } = useStore();
	const navigate = useNavigate();
	const { folderId } = useParams<{ folderId: string }>();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [speedDialOpen, setSpeedDialOpen] = useState(false);
	const [draggingFiles, setDraggingFiles] = useState(false);
	const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
	const [uploadId, setUploadId] = useState(0);
	const dragDepth = useRef(0);
	const uploadInputRef = useRef<HTMLInputElement | null>(null);
	const speedDialRef = useRef<HTMLDivElement | null>(null);
	useNotificationSocket();

	const openCommandPalette = useCallback(() => {
		setCommandPaletteOpen(true);
	}, []);

	useEffect(() => {
		if (!mobileMenuOpen) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMobileMenuOpen(false);
		};

		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [mobileMenuOpen]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) return;
			event.preventDefault();
			setCommandPaletteOpen((open) => !open);
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	useEffect(() => {
		if (!speedDialOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			if (!speedDialRef.current?.contains(event.target as Node)) setSpeedDialOpen(false);
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setSpeedDialOpen(false);
		};

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [speedDialOpen]);

	const handleUploadPicked = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		if (files.length > 0) {
			setDroppedFiles(files);
			setUploadId((id) => id + 1);
		}
		event.target.value = '';
	}, []);

	const runSpeedDialAction = useCallback((action: () => void) => {
		action();
		setSpeedDialOpen(false);
	}, []);

	const speedDialActions = [
		{
			label: 'Upload Document',
			icon: Upload,
			action: () => uploadInputRef.current?.click(),
		},
		{
			label: 'New Case',
			icon: FolderPlus,
			action: () => navigate('/cases?create=true'),
		},
		{
			label: 'Start Scan',
			icon: ScanLine,
			action: () => navigate('/scanning-projects?new=true'),
		},
		{
			label: 'Quick Search',
			icon: Search,
			action: () => setCommandPaletteOpen(true),
		},
	];

	useEffect(() => {
		const hasFiles = (event: DragEvent) =>
			Array.from(event.dataTransfer?.types ?? []).includes('Files');

		const handleDragEnter = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current += 1;
			setDraggingFiles(true);
		};

		const handleDragOver = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
			setDraggingFiles(true);
		};

		const handleDragLeave = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current = Math.max(0, dragDepth.current - 1);
			if (dragDepth.current === 0) setDraggingFiles(false);
		};

		const handleDrop = (event: DragEvent) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current = 0;
			setDraggingFiles(false);

			const files = Array.from(event.dataTransfer?.files ?? []);
			if (files.length === 0) return;
			setDroppedFiles(files);
			setUploadId((id) => id + 1);
		};

		const target = document.body;
		target.addEventListener('dragenter', handleDragEnter);
		target.addEventListener('dragover', handleDragOver);
		target.addEventListener('dragleave', handleDragLeave);
		target.addEventListener('drop', handleDrop);

		return () => {
			target.removeEventListener('dragenter', handleDragEnter);
			target.removeEventListener('dragover', handleDragOver);
			target.removeEventListener('dragleave', handleDragLeave);
			target.removeEventListener('drop', handleDrop);
		};
	}, []);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-200">
			<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-brass-500 text-slate-900 px-4 py-2 rounded">Skip to main content</a>
			{/* Noise texture overlay */}
			<div className="noise-overlay" />

			{/* Background gradient */}
			<div className="fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
				<div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brass-500/5 blur-[100px]" />
				<div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brass-600/5 blur-[80px]" />
			</div>

			<div className="flex h-screen overflow-hidden">
				{/* Desktop sidebar */}
				<div className="hidden md:block">
					<Sidebar />
				</div>

				{/* Mobile sidebar overlay */}
				{mobileMenuOpen && (
					<button
						type="button"
						className="fixed inset-0 z-40 bg-black/50 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
						aria-label="Close navigation menu"
						onClick={() => setMobileMenuOpen(false)}
					/>
				)}
				<div
					className={cn(
						'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:hidden',
						mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
					)}
					aria-hidden={!mobileMenuOpen}
				>
					<Sidebar onClose={() => setMobileMenuOpen(false)} />
				</div>

				{/* Main content */}
				<div
					className={cn(
						'flex-1 flex flex-col overflow-hidden transition-all duration-300',
						sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
					)}
				>
					<Header
						onMenuClick={() => setMobileMenuOpen(true)}
						onOpenCommandPalette={openCommandPalette}
					/>

					<main id="main-content" className="flex-1 overflow-auto">
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
							className="px-4 py-4 md:p-6"
						>
							<ErrorBoundary>
								<Suspense fallback={<PageSkeleton />}>
									<Outlet />
								</Suspense>
							</ErrorBoundary>
						</motion.div>
					</main>
				</div>
			</div>
			<CommandPalette
				open={commandPaletteOpen}
				onClose={() => setCommandPaletteOpen(false)}
			/>
			<div ref={speedDialRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
				<input
					ref={uploadInputRef}
					type="file"
					multiple
					className="hidden"
					onChange={handleUploadPicked}
				/>
				{speedDialOpen && (
					<div className="flex flex-col items-end gap-2">
						{speedDialActions.map(({ label, icon: Icon, action }) => (
							<button
								key={label}
								type="button"
								onClick={() => runSpeedDialAction(action)}
								className="group flex items-center gap-2 rounded-full bg-slate-900/95 px-3 py-2 text-sm font-medium text-slate-100 shadow-lg ring-1 ring-brass-500/30 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400"
							>
								<span>{label}</span>
								<span className="flex h-8 w-8 items-center justify-center rounded-full bg-brass-500 text-slate-950">
									<Icon className="h-4 w-4" aria-hidden="true" />
								</span>
							</button>
						))}
					</div>
				)}
				<button
					type="button"
					onClick={() => setSpeedDialOpen((open) => !open)}
					aria-expanded={speedDialOpen}
					aria-label="Quick document actions"
					className="flex h-14 w-14 items-center justify-center rounded-full bg-brass-500 text-slate-950 shadow-xl shadow-black/30 ring-1 ring-brass-300/80 transition hover:bg-brass-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-200"
				>
					{speedDialOpen ? <FilePlus2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
				</button>
			</div>
			<DropZoneOverlay
				files={droppedFiles}
				isDragging={draggingFiles}
				parentId={folderId}
				uploadId={uploadId}
				onClose={() => setDroppedFiles([])}
			/>
			<ModalManager />
		</div>
	);
}
