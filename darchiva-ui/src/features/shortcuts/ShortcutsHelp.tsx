// (c) Copyright Datacraft, 2026
/**
 * ShortcutsHelp — modal overlay listing all keyboard shortcuts, triggered by "?".
 */
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface ShortcutEntry {
	keys: string[];
	label: string;
	comingSoon?: boolean;
}

interface ShortcutGroup {
	title: string;
	entries: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
	{
		title: 'Navigation',
		entries: [
			{ keys: ['⌘K', 'Ctrl+K'], label: 'Open command palette' },
			{ keys: ['G', 'H'],        label: 'Go Home' },
			{ keys: ['G', 'I'],        label: 'Go to Inbox' },
			{ keys: ['G', 'D'],        label: 'Go to Documents' },
			{ keys: ['G', 'S'],        label: 'Go to Search' },
			{ keys: ['G', 'A'],        label: 'Go to Analytics' },
		],
	},
	{
		title: 'Document',
		entries: [
			{ keys: ['⌘↵'],  label: 'Open selected document', comingSoon: true },
			{ keys: ['⌘E'],  label: 'Edit document metadata',  comingSoon: true },
			{ keys: ['⌘⇧D'], label: 'Download document',       comingSoon: true },
			{ keys: ['⌘⇧S'], label: 'Share document',          comingSoon: true },
		],
	},
	{
		title: 'General',
		entries: [
			{ keys: ['?'],   label: 'Show this help' },
			{ keys: ['Esc'], label: 'Close dialog / palette' },
		],
	},
];

interface KeyBadgeProps {
	k: string;
	dimmed?: boolean;
}

function KeyBadge({ k, dimmed }: KeyBadgeProps) {
	return (
		<kbd
			className={cn(
				'inline-flex min-w-[1.75rem] items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none',
				dimmed
					? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
					: 'border-gray-300 bg-white text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
			)}
		>
			{k}
		</kbd>
	);
}

interface ShortcutsHelpProps {
	open: boolean;
	onClose: () => void;
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						key="sh-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
						onClick={onClose}
					/>

					{/* Panel */}
					<motion.div
						key="sh-panel"
						initial={{ opacity: 0, scale: 0.96, y: -8 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: -8 }}
						transition={{ duration: 0.15 }}
						className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
					>
						{/* Header */}
						<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
							<div className="flex items-center gap-2">
								<Keyboard size={18} className="text-gray-500" />
								<h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
									Keyboard Shortcuts
								</h2>
							</div>
							<button
								onClick={onClose}
								className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
								aria-label="Close shortcuts help"
							>
								<X size={18} />
							</button>
						</div>

						{/* Groups grid */}
						<div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
							{SHORTCUT_GROUPS.map(group => (
								<div key={group.title}>
									<h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
										{group.title}
									</h3>
									<ul className="space-y-2.5">
										{group.entries.map(entry => (
											<li key={entry.label} className="flex items-center justify-between gap-3">
												<span
													className={cn(
														'text-sm',
														entry.comingSoon
															? 'text-gray-400 dark:text-gray-500'
															: 'text-gray-700 dark:text-gray-300',
													)}
												>
													{entry.label}
													{entry.comingSoon && (
														<span className="ml-1.5 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium uppercase text-gray-400 dark:bg-gray-800 dark:text-gray-500">
															soon
														</span>
													)}
												</span>
												<div className="flex shrink-0 items-center gap-1">
													{entry.keys.map(k => (
														<KeyBadge key={k} k={k} dimmed={entry.comingSoon} />
													))}
												</div>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>

						{/* Footer */}
						<div className="border-t border-gray-200 px-6 py-3 text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
							Press <KeyBadge k="?" dimmed /> again or <KeyBadge k="Esc" dimmed /> to close
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
