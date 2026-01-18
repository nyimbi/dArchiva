// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Search,
	Bell,
	Sun,
	Moon,
	User,
	Settings,
	LogOut,
	ChevronDown,
	Plus,
	Upload,
	FileText,
	FolderPlus,
} from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

export function Header() {
	const { theme, toggleTheme, user, pendingTasks, openModal } = useStore();
	const [searchOpen, setSearchOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [createMenuOpen, setCreateMenuOpen] = useState(false);

	return (
		<header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 bg-slate-925/80 backdrop-blur-lg">
			{/* Search */}
			<div className="flex-1 max-w-md">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
					<input
						type="text"
						placeholder="Search documents, cases, workflows..."
						className="input-field pl-10 pr-4 py-2"
						onFocus={() => setSearchOpen(true)}
						onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
					/>
					<kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-2xs font-mono text-slate-500 bg-slate-800 rounded border border-slate-700">
						⌘K
					</kbd>
				</div>

				{/* Search results dropdown */}
				<AnimatePresence>
					{searchOpen && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="absolute top-full left-0 right-0 mt-2 glass-card p-2 max-w-md"
						>
							<p className="px-3 py-2 text-xs text-slate-500">
								Start typing to search...
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2">
				{/* Create button */}
				<div className="relative">
					<button
						onClick={() => setCreateMenuOpen(!createMenuOpen)}
						className="btn-primary"
					>
						<Plus className="w-4 h-4" />
						<span className="hidden sm:inline">New</span>
						<ChevronDown className="w-3 h-3 opacity-50" />
					</button>

					<AnimatePresence>
						{createMenuOpen && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="absolute right-0 top-full mt-2 w-48 glass-card py-1 z-50"
							>
								<button
									onClick={() => {
										openModal('upload');
										setCreateMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
								>
									<Upload className="w-4 h-4 text-slate-400" />
									Upload Document
								</button>
								<button
									onClick={() => {
										openModal('create-folder');
										setCreateMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
								>
									<FolderPlus className="w-4 h-4 text-slate-400" />
									New Folder
								</button>
								<button
									onClick={() => {
										openModal('create-case');
										setCreateMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
								>
									<FileText className="w-4 h-4 text-slate-400" />
									New Case
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Theme toggle */}
				<button
					onClick={toggleTheme}
					className="btn-ghost p-2"
					title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{theme === 'dark' ? (
						<Sun className="w-5 h-5" />
					) : (
						<Moon className="w-5 h-5" />
					)}
				</button>

				{/* Notifications */}
				<button className="btn-ghost p-2 relative">
					<Bell className="w-5 h-5" />
					{pendingTasks.length > 0 && (
						<span className="absolute top-1 right-1 w-2 h-2 bg-brass-500 rounded-full" />
					)}
				</button>

				{/* User menu */}
				<div className="relative ml-2">
					<button
						onClick={() => setUserMenuOpen(!userMenuOpen)}
						className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-800/50 transition-colors"
					>
						<div className="w-8 h-8 rounded-lg bg-brass-500/20 border border-brass-500/30 flex items-center justify-center">
							<span className="text-sm font-medium text-brass-400">
								{user?.firstName?.[0] || 'U'}
							</span>
						</div>
						<ChevronDown className="w-4 h-4 text-slate-400" />
					</button>

					<AnimatePresence>
						{userMenuOpen && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="absolute right-0 top-full mt-2 w-56 glass-card py-1 z-50"
							>
								<div className="px-3 py-2 border-b border-slate-700/50">
									<p className="text-sm font-medium text-slate-200">
										{user?.firstName} {user?.lastName}
									</p>
									<p className="text-xs text-slate-500">{user?.email}</p>
								</div>
								<button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50">
									<User className="w-4 h-4 text-slate-400" />
									Profile
								</button>
								<button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50">
									<Settings className="w-4 h-4 text-slate-400" />
									Preferences
								</button>
								<div className="border-t border-slate-700/50 mt-1 pt-1">
									<button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-slate-800/50">
										<LogOut className="w-4 h-4" />
										Sign out
									</button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
		</header>
	);
}
