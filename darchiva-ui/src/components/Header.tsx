// (c) Copyright Datacraft, 2026
import { useAuth } from '@/features/auth';
import { useStore } from '@/hooks/useStore';
import { AnimatePresence,motion } from 'framer-motion';
import {
  ChevronDown,
  FileText,
  FolderPlus,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Upload,
  User,
} from 'lucide-react';
import { NotificationCenter } from '@/features/notifications';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
	onOpenCommandPalette?: () => void;
	onMenuClick?: () => void;
}

export function Header({ onOpenCommandPalette, onMenuClick }: HeaderProps) {
	const navigate = useNavigate();
	const { user, pendingTasks, openModal, setUser } = useStore();
	const { logout } = useAuth();
	const [searchOpen, setSearchOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [createMenuOpen, setCreateMenuOpen] = useState(false);

	const handleSignOut = () => {
		logout();
		setUser(null);
		setUserMenuOpen(false);
		navigate('/login');
	};

	return (
		<header className="h-16 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-slate-800/50 bg-slate-925/80 backdrop-blur-lg">
			<div className="flex items-center gap-3 md:hidden">
				<button
					type="button"
					onClick={onMenuClick}
					className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
					aria-label="Open navigation menu"
				>
					<Menu className="w-5 h-5" aria-hidden="true" />
				</button>
				<span className="font-display text-lg font-semibold text-slate-100">dArchiva</span>
			</div>

			{/* Search */}
			<div className="hidden md:block flex-1 max-w-md">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
					<input
						type="text"
						placeholder="Search documents, cases, workflows..."
						aria-label="Search documents, cases, workflows..."
						className="input-field pl-10 pr-4 py-2"
						onFocus={() => setSearchOpen(true)}
						onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') setSearchOpen(false);
							if (e.key === 'Enter') {
								navigate(`/search?q=${encodeURIComponent(e.currentTarget.value)}`);
								setSearchOpen(false);
							}
						}}
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
				<button
					type="button"
					onClick={onOpenCommandPalette}
					className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200 md:flex"
					aria-label="Open command palette"
					title="Open command palette"
				>
					<Search className="h-4 w-4" aria-hidden="true" />
				</button>

				{/* Create button */}
				<div className="relative hidden md:block">
					<button
						onClick={() => setCreateMenuOpen(!createMenuOpen)}
						className="btn-primary"
						aria-haspopup="true"
						aria-expanded={createMenuOpen}
						aria-label="Create new item"
						onKeyDown={(e) => {
							if (e.key === 'Escape') setCreateMenuOpen(false);
						}}
					>
						<Plus className="w-4 h-4" />
						<span className="hidden sm:inline">New</span>
						<ChevronDown className="w-3 h-3 opacity-50" aria-hidden="true" />
					</button>

					<AnimatePresence>
						{createMenuOpen && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="absolute right-0 top-full mt-2 w-48 glass-card py-1 z-50"
								role="menu"
							>
								<button
									onClick={() => {
										openModal('upload');
										setCreateMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
									role="menuitem"
								>
									<Upload className="w-4 h-4 text-slate-400" aria-hidden="true" />
									Upload Document
								</button>
								<button
									onClick={() => {
										openModal('create-folder');
										setCreateMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
									role="menuitem"
								>
									<FolderPlus className="w-4 h-4 text-slate-400" aria-hidden="true" />
									New Folder
								</button>
								<button
									onClick={() => {
										openModal('create-case');
										setCreateMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
									role="menuitem"
								>
									<FileText className="w-4 h-4 text-slate-400" aria-hidden="true" />
									New Case
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Theme toggle */}
				<div className="hidden md:block">
					<ThemeToggle />
				</div>

				{/* Notifications */}
				<NotificationCenter />

				{/* User menu */}
				<div className="relative ml-2">
					<button
						onClick={() => setUserMenuOpen(!userMenuOpen)}
						className="flex items-center gap-2 p-1 md:pr-2 rounded-lg hover:bg-slate-800/50 transition-colors"
						aria-haspopup="true"
						aria-expanded={userMenuOpen}
						aria-label="User menu"
						onKeyDown={(e) => {
							if (e.key === 'Escape') setUserMenuOpen(false);
						}}
					>
						<div className="w-8 h-8 rounded-lg bg-brass-500/20 border border-brass-500/30 flex items-center justify-center" aria-hidden="true">
							<span className="text-sm font-medium text-brass-400">
								{user?.firstName?.[0] || 'U'}
							</span>
						</div>
						<ChevronDown className="hidden md:block w-4 h-4 text-slate-400" aria-hidden="true" />
					</button>

					<AnimatePresence>
						{userMenuOpen && (
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="absolute right-0 top-full mt-2 w-56 glass-card py-1 z-50"
								role="menu"
							>
								<div className="px-3 py-2 border-b border-slate-700/50">
									<p className="text-sm font-medium text-slate-200">
										{user?.firstName} {user?.lastName}
									</p>
									<p className="text-xs text-slate-500">{user?.email}</p>
								</div>
								<button
									onClick={() => {
										openModal('user-profile');
										setUserMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
									role="menuitem"
								>
									<User className="w-4 h-4 text-slate-400" aria-hidden="true" />
									Profile
								</button>
								<button
									onClick={() => {
										navigate('/settings');
										setUserMenuOpen(false);
									}}
									className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
									role="menuitem"
								>
									<Settings className="w-4 h-4 text-slate-400" aria-hidden="true" />
									Preferences
								</button>
								<div className="border-t border-slate-700/50 mt-1 pt-1">
									<button
										onClick={handleSignOut}
										className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-slate-800/50"
										role="menuitem"
									>
										<LogOut className="w-4 h-4" aria-hidden="true" />
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
