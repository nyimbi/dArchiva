// (c) Copyright Datacraft, 2026
import { CommandPalette } from '@/features/command-palette/CommandPalette';
import { useNotificationSocket } from '@/features/notifications/useNotificationSocket';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { ModalManager } from './ModalManager';
import { PageSkeleton } from './PageSkeleton';
import { Sidebar } from './Sidebar';

export function Layout() {
	const { sidebarCollapsed } = useStore();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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
			<ModalManager />
		</div>
	);
}
