// (c) Copyright Datacraft, 2026
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

export function Layout() {
	const { sidebarCollapsed } = useStore();

	return (
		<div className="min-h-screen bg-slate-950 text-slate-200">
			{/* Noise texture overlay */}
			<div className="noise-overlay" />

			{/* Background gradient */}
			<div className="fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
				<div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brass-500/5 blur-[100px]" />
				<div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-brass-600/5 blur-[80px]" />
			</div>

			<div className="flex h-screen overflow-hidden">
				{/* Sidebar */}
				<Sidebar />

				{/* Main content */}
				<div
					className={cn(
						'flex-1 flex flex-col overflow-hidden transition-all duration-300',
						sidebarCollapsed ? 'ml-16' : 'ml-64'
					)}
				>
					<Header />

					<main className="flex-1 overflow-auto">
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
							className="p-6"
						>
							<Outlet />
						</motion.div>
					</main>
				</div>
			</div>
		</div>
	);
}
