// ═══════════════════════════════════════════════════════════════════════════
// dArchiva User Home Page - "Warm Archival" Theme
// A vintage library aesthetic meets modern productivity
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import {
	Search, Bell, Star, Clock, FileText, Folder, Upload, Plus,
	CheckCircle2, AlertCircle, Calendar, ArrowRight, ChevronRight,
	Eye, Pencil, Share2, MessageSquare, MoreHorizontal, X,
	TrendingUp, Inbox, History, Zap, ExternalLink, ChevronLeft,
	Check, Sparkles, Archive, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	useUserHome, useTaskAction, useQuickUpload, useMarkNotificationRead,
	useClearRecentSearches,
} from '../api/hooks';
import type {
	WorkflowTask, RecentDocument, FavoriteItem, Notification,
	CalendarEvent, ActivityEvent, RecentSearch, TaskPriority,
} from '../types';
import '../styles/theme.css';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export function UserHomePage() {
	const { data: homeData, isLoading } = useUserHome();
	const [searchQuery, setSearchQuery] = useState('');
	const [showNotifications, setShowNotifications] = useState(false);

	if (isLoading) {
		return <HomePageSkeleton />;
	}

	const user = homeData?.user;
	const stats = homeData?.stats;
	const greeting = getGreeting();
	const firstName = user?.name?.split(' ')[0] || 'there';

	return (
		<div className="home-root min-h-screen relative">
			<div className="max-w-[1680px] mx-auto px-8 py-8">
				{/* ─── Header ─── */}
				<header className="flex items-start justify-between mb-10 home-animate-in home-stagger-1">
					<div className="max-w-xl">
						<h1 className="home-greeting">
							{greeting}, <span className="home-greeting-emphasis">{firstName}</span>
						</h1>
						<p className="home-subgreeting">
							{getDateString()}
							{stats?.pending_tasks ? (
								<> — <span className="text-[var(--home-accent)] font-medium">{stats.pending_tasks} task{stats.pending_tasks !== 1 ? 's' : ''}</span> awaiting your attention</>
							) : (
								<> — Your archive is in order</>
							)}
						</p>
					</div>

					<div className="flex items-center gap-3">
						<NotificationBell
							count={homeData?.notifications?.filter(n => !n.is_read).length || 0}
							isOpen={showNotifications}
							onToggle={() => setShowNotifications(!showNotifications)}
						/>
						<QuickActionsBar />
					</div>
				</header>

				{/* ─── Stats Row ─── */}
				<div className="grid grid-cols-4 gap-5 mb-10">
					{[
						{ value: stats?.pending_tasks || 0, label: 'Pending Tasks', icon: Inbox, trend: stats?.pending_tasks && stats.pending_tasks > 5 ? 'warning' : undefined },
						{ value: stats?.documents_this_week || 0, label: 'Documents This Week', icon: FileText },
						{ value: stats?.approvals_pending || 0, label: 'Awaiting Approval', icon: CheckCircle2 },
						{ value: stats?.deadlines_upcoming || 0, label: 'Upcoming Deadlines', icon: Calendar, trend: stats?.deadlines_upcoming && stats.deadlines_upcoming > 3 ? 'error' : undefined },
					].map((stat, i) => (
						<div
							key={stat.label}
							className={cn(
								'home-card home-card-interactive p-5 flex items-center gap-5 home-animate-in',
								`home-stagger-${i + 2}`
							)}
						>
							<div className={cn('home-stat-icon', stat.trend)}>
								<stat.icon className="w-5 h-5" />
							</div>
							<div className="home-stat">
								<span className="home-stat-value">{stat.value}</span>
								<span className="home-stat-label">{stat.label}</span>
							</div>
						</div>
					))}
				</div>

				{/* ─── Main Grid ─── */}
				<div className="grid grid-cols-12 gap-6">
					{/* Left Column */}
					<div className="col-span-8 space-y-6">
						{/* Search */}
						<div className="home-animate-in home-stagger-3">
							<SearchBar
								value={searchQuery}
								onChange={setSearchQuery}
								recentSearches={homeData?.recent_searches || []}
							/>
						</div>

						{/* Workflow Tasks */}
						<div className="home-animate-in home-stagger-4">
							<WorkflowTasksPanel tasks={homeData?.tasks || []} />
						</div>

						{/* Recent Documents */}
						<div className="home-animate-in home-stagger-5">
							<RecentDocumentsPanel documents={homeData?.recent_documents || []} />
						</div>

						{/* Upload Zone */}
						<div className="home-animate-in home-stagger-6">
							<QuickUploadZone />
						</div>
					</div>

					{/* Right Column */}
					<div className="col-span-4 space-y-6">
						{/* Favorites */}
						<div className="home-animate-in home-stagger-3">
							<FavoritesPanel favorites={homeData?.favorites || []} />
						</div>

						{/* Calendar */}
						<div className="home-animate-in home-stagger-4">
							<MiniCalendar events={homeData?.calendar_events || []} />
						</div>

						{/* Activity */}
						<div className="home-animate-in home-stagger-5">
							<ActivityFeedPanel activity={homeData?.activity || []} />
						</div>
					</div>
				</div>

				{/* Notifications Drawer */}
				{showNotifications && (
					<NotificationsDrawer
						notifications={homeData?.notifications || []}
						onClose={() => setShowNotifications(false)}
					/>
				)}
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function NotificationBell({ count, isOpen, onToggle }: { count: number; isOpen: boolean; onToggle: () => void }) {
	return (
		<button
			onClick={onToggle}
			className={cn(
				'relative p-2.5 rounded-xl transition-all duration-200',
				isOpen
					? 'bg-[var(--home-accent)] text-[var(--home-text-inverse)]'
					: 'hover:bg-[var(--home-bg-hover)] text-[var(--home-text-secondary)]'
			)}
		>
			<Bell className="w-5 h-5" />
			{count > 0 && (
				<span className="home-notification-badge absolute -top-1 -right-1">
					{count > 99 ? '99+' : count}
				</span>
			)}
		</button>
	);
}

function QuickActionsBar() {
	const navigate = useNavigate();
	const { openModal } = useStore();

	return (
		<div className="flex items-center gap-2">
			<button
				className="home-quick-action"
				onClick={() => navigate('/documents')}
			>
				<Plus className="w-4 h-4" />
				<span>New Document</span>
			</button>
			<button
				className="home-quick-action-primary home-quick-action"
				onClick={() => openModal('upload')}
			>
				<Upload className="w-4 h-4" />
				<span>Upload</span>
			</button>
		</div>
	);
}

function SearchBar({ value, onChange, recentSearches }: {
	value: string;
	onChange: (v: string) => void;
	recentSearches: RecentSearch[];
}) {
	const [isFocused, setIsFocused] = useState(false);
	const clearSearches = useClearRecentSearches();

	return (
		<div className="relative">
			<div className="home-search">
				<Search className="home-search-icon w-5 h-5" />
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setTimeout(() => setIsFocused(false), 200)}
					placeholder="Search your archive..."
					className="home-search-input"
				/>
			</div>

			{isFocused && recentSearches.length > 0 && !value && (
				<div className="home-search-dropdown home-animate-scale">
					<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--home-border-subtle)]">
						<span className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-muted)]">
							Recent Searches
						</span>
						<button
							className="text-xs font-medium text-[var(--home-accent)] hover:underline"
							onClick={(e) => {
								e.preventDefault();
								clearSearches.mutate();
							}}
						>
							Clear All
						</button>
					</div>
					<div className="py-2">
						{recentSearches.slice(0, 5).map((search) => (
							<button
								key={search.id}
								onClick={() => onChange(search.query)}
								className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--home-bg-hover)] text-left transition-colors"
							>
								<History className="w-4 h-4 text-[var(--home-text-muted)]" />
								<span className="text-sm text-[var(--home-text-secondary)] flex-1">{search.query}</span>
								<span className="text-xs text-[var(--home-text-muted)] tabular-nums">
									{search.result_count} results
								</span>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function WorkflowTasksPanel({ tasks }: { tasks: WorkflowTask[] }) {
	const navigate = useNavigate();
	const taskAction = useTaskAction();

	const sortedTasks = useMemo(() => {
		const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
		return [...tasks].sort((a, b) => {
			if (a.status === 'overdue' && b.status !== 'overdue') return -1;
			if (b.status === 'overdue' && a.status !== 'overdue') return 1;
			return priorityOrder[a.priority] - priorityOrder[b.priority];
		});
	}, [tasks]);

	const handleAction = (taskId: string, actionId: string) => {
		taskAction.mutate({ task_id: taskId, action_id: actionId });
	};

	return (
		<div className="home-card home-card-stacked overflow-hidden">
			<div className="home-section-header px-6 pt-6 pb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-[var(--home-accent-muted)]">
						<Inbox className="w-4 h-4 text-[var(--home-accent)]" />
					</div>
					<div>
						<h2 className="home-section-title">Workflow Tasks</h2>
						{tasks.length > 0 && (
							<p className="text-xs text-[var(--home-text-muted)] mt-0.5">
								{tasks.filter(t => t.status === 'overdue').length} overdue
							</p>
						)}
					</div>
				</div>
				<button
					className="home-section-action"
					onClick={() => navigate('/workflows')}
				>
					View All <ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{sortedTasks.length === 0 ? (
				<div className="home-empty">
					<div className="home-empty-icon">
						<Sparkles className="w-7 h-7" />
					</div>
					<p className="home-empty-title">All caught up!</p>
					<p className="home-empty-description">No pending tasks in your queue</p>
				</div>
			) : (
				<div>
					{sortedTasks.slice(0, 5).map((task) => (
						<div
							key={task.id}
							className={cn('home-task-item', task.priority)}
						>
							<div className="home-task-checkbox" onClick={(e) => e.stopPropagation()}>
								{/* Checkbox would trigger task completion */}
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h3 className="font-medium text-[0.9375rem] text-[var(--home-text-primary)] truncate">
											{task.title}
										</h3>
										<p className="text-sm text-[var(--home-text-tertiary)] mt-1 flex items-center gap-2">
											<span className="truncate">{task.workflow_name}</span>
											{task.document_title && (
												<>
													<span className="text-[var(--home-border-strong)]">•</span>
													<span className="text-[var(--home-text-secondary)] truncate">
														{task.document_title}
													</span>
												</>
											)}
										</p>
									</div>

									<div className="flex items-center gap-2 shrink-0">
										{task.status === 'overdue' ? (
											<span className="home-badge home-badge-error">
												<AlertCircle className="w-3 h-3" />
												Overdue
											</span>
										) : task.due_date && (
											<span className="text-xs text-[var(--home-text-muted)]">
												Due {formatRelativeDate(task.due_date)}
											</span>
										)}
									</div>
								</div>

								{task.actions.length > 0 && (
									<div className="flex items-center gap-2 mt-3">
										{task.actions.slice(0, 2).map((action) => (
											<Button
												key={action.id}
												size="sm"
												variant={action.type === 'approve' ? 'default' : 'outline'}
												className={cn(
													'h-8 text-xs font-medium rounded-lg',
													action.type === 'approve' && 'bg-[var(--home-success)] hover:bg-[var(--home-success)]/90 border-0'
												)}
												onClick={() => handleAction(task.id, action.id)}
												disabled={taskAction.isPending}
											>
												{action.type === 'approve' && <Check className="w-3.5 h-3.5 mr-1.5" />}
												{action.label}
											</Button>
										))}
										{task.actions.length > 2 && (
											<Button size="sm" variant="ghost" className="h-8 px-2">
												<MoreHorizontal className="w-4 h-4" />
											</Button>
										)}
									</div>
								)}
							</div>
						</div>
					))}

					{sortedTasks.length > 5 && (
						<div className="px-6 py-4 border-t border-[var(--home-border-subtle)] bg-[var(--home-bg-muted)]">
							<button
								className="text-sm font-medium text-[var(--home-accent)] hover:text-[var(--home-accent-hover)] flex items-center gap-2 transition-colors"
								onClick={() => navigate('/workflows')}
							>
								<span>Show {sortedTasks.length - 5} more tasks</span>
								<ArrowRight className="w-4 h-4" />
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function RecentDocumentsPanel({ documents }: { documents: RecentDocument[] }) {
	const navigate = useNavigate();

	const getDocType = (type: RecentDocument['type']): string => {
		switch (type) {
			case 'pdf': return 'PDF';
			case 'doc':
			case 'docx': return 'DOC';
			case 'xls':
			case 'xlsx': return 'XLS';
			case 'img': return 'IMG';
			default: return 'FILE';
		}
	};

	const getDocIconClass = (type: RecentDocument['type']): string => {
		switch (type) {
			case 'pdf': return 'pdf';
			case 'doc':
			case 'docx': return 'doc';
			case 'xls':
			case 'xlsx': return 'xls';
			case 'img': return 'img';
			default: return 'default';
		}
	};

	return (
		<div className="home-card overflow-hidden">
			<div className="home-section-header px-6 pt-6 pb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-[var(--home-info-muted)]">
						<BookOpen className="w-4 h-4 text-[var(--home-info)]" />
					</div>
					<h2 className="home-section-title">Recent Documents</h2>
				</div>
				<button
					className="home-section-action"
					onClick={() => navigate('/documents')}
				>
					View Archive <ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{documents.length === 0 ? (
				<div className="home-empty">
					<div className="home-empty-icon">
						<Archive className="w-7 h-7" />
					</div>
					<p className="home-empty-title">Your archive awaits</p>
					<p className="home-empty-description">Documents you access will appear here</p>
				</div>
			) : (
				<div className="px-4 pb-4">
					{documents.slice(0, 6).map((doc) => (
						<div key={doc.id} className="home-doc-item group">
							<div className={cn('home-doc-icon', getDocIconClass(doc.type))}>
								{getDocType(doc.type)}
							</div>
							<div className="flex-1 min-w-0">
								<h4 className="text-sm font-medium text-[var(--home-text-primary)] truncate group-hover:text-[var(--home-accent)] transition-colors">
									{doc.title}
								</h4>
								<p className="text-xs text-[var(--home-text-muted)] truncate mt-0.5">
									{doc.path}
								</p>
							</div>
							<div className="flex items-center gap-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
								{doc.access_type === 'edited' && (
									<Pencil className="w-3.5 h-3.5 text-[var(--home-warning)]" />
								)}
								{doc.access_type === 'shared' && (
									<Share2 className="w-3.5 h-3.5 text-[var(--home-success)]" />
								)}
								<span className="text-xs text-[var(--home-text-muted)] tabular-nums">
									{formatRelativeDate(doc.accessed_at)}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function QuickUploadZone() {
	const [isDragOver, setIsDragOver] = useState(false);
	const upload = useQuickUpload();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			upload.mutate({ files });
		}
	}, [upload]);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files ? Array.from(e.target.files) : [];
		if (files.length > 0) {
			upload.mutate({ files });
		}
	};

	return (
		<div
			className={cn('home-upload-zone', isDragOver && 'dragover')}
			onDrop={handleDrop}
			onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
			onDragLeave={() => setIsDragOver(false)}
			onClick={() => inputRef.current?.click()}
		>
			<input
				ref={inputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileSelect}
			/>
			<div className="home-upload-icon">
				<Upload className="w-6 h-6" />
			</div>
			<p className="text-base font-medium text-[var(--home-text-secondary)]">
				Drop documents here to archive
			</p>
			<p className="text-sm text-[var(--home-text-muted)] mt-2">
				or <span className="text-[var(--home-accent)] font-medium">browse your files</span>
			</p>
			{upload.isPending && (
				<p className="text-sm text-[var(--home-accent)] font-medium mt-3 animate-pulse">
					Archiving documents...
				</p>
			)}
		</div>
	);
}

function FavoritesPanel({ favorites }: { favorites: FavoriteItem[] }) {
	const { openModal } = useStore();

	const getItemIcon = (type: FavoriteItem['item_type']) => {
		switch (type) {
			case 'document': return FileText;
			case 'folder': return Folder;
			case 'search': return Search;
			case 'workflow': return Zap;
		}
	};

	return (
		<div className="home-card overflow-hidden">
			<div className="home-section-header px-5 pt-5 pb-3">
				<div className="flex items-center gap-2">
					<Star className="w-4 h-4 text-[var(--home-gold)]" />
					<h2 className="home-section-title">Favorites</h2>
				</div>
				<button
					className="home-section-action"
					onClick={() => openModal('manage-favorites')}
				>
					Manage
				</button>
			</div>

			{favorites.length === 0 ? (
				<div className="home-empty py-8">
					<div className="home-empty-icon">
						<Star className="w-6 h-6" />
					</div>
					<p className="home-empty-title">No favorites yet</p>
					<p className="home-empty-description">Star items for quick access</p>
				</div>
			) : (
				<div className="px-3 pb-3">
					{favorites.slice(0, 8).map((item) => {
						const Icon = getItemIcon(item.item_type);
						return (
							<button key={item.id} className="home-favorite w-full group">
								<Star className="w-3.5 h-3.5 home-favorite-star fill-current" />
								<Icon className="w-4 h-4 text-[var(--home-text-tertiary)]" />
								<span className="text-sm text-[var(--home-text-secondary)] truncate flex-1 text-left group-hover:text-[var(--home-text-primary)] transition-colors">
									{item.title}
								</span>
								<ExternalLink className="w-3.5 h-3.5 text-[var(--home-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

function MiniCalendar({ events }: { events: CalendarEvent[] }) {
	const today = new Date();
	const [currentMonth, setCurrentMonth] = useState(today.getMonth());
	const [currentYear, setCurrentYear] = useState(today.getFullYear());

	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
	const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

	const eventDates = useMemo(() => {
		const dates = new Set<string>();
		events.forEach(event => {
			const eventDate = new Date(event.date);
			if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
				dates.add(eventDate.getDate().toString());
			}
		});
		return dates;
	}, [events, currentMonth, currentYear]);

	const navigateMonth = (direction: -1 | 1) => {
		if (direction === -1) {
			if (currentMonth === 0) {
				setCurrentMonth(11);
				setCurrentYear(currentYear - 1);
			} else {
				setCurrentMonth(currentMonth - 1);
			}
		} else {
			if (currentMonth === 11) {
				setCurrentMonth(0);
				setCurrentYear(currentYear + 1);
			} else {
				setCurrentMonth(currentMonth + 1);
			}
		}
	};

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	return (
		<div className="home-card p-5">
			<div className="flex items-center justify-between mb-4">
				<h2 className="home-section-title">{monthNames[currentMonth]} {currentYear}</h2>
				<div className="flex items-center gap-1">
					<button
						onClick={() => navigateMonth(-1)}
						className="p-1.5 rounded-lg hover:bg-[var(--home-bg-hover)] text-[var(--home-text-tertiary)] transition-colors"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<button
						onClick={() => navigateMonth(1)}
						className="p-1.5 rounded-lg hover:bg-[var(--home-bg-hover)] text-[var(--home-text-tertiary)] transition-colors"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>

			<div className="home-calendar-grid mb-1">
				{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
					<div key={i} className="home-calendar-header">{day}</div>
				))}
			</div>

			<div className="home-calendar-grid">
				{Array.from({ length: firstDayOfMonth }).map((_, i) => (
					<div key={`empty-${i}`} className="home-calendar-day other-month" />
				))}
				{Array.from({ length: daysInMonth }).map((_, i) => {
					const day = i + 1;
					const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
					const hasEvent = eventDates.has(day.toString());

					return (
						<div
							key={day}
							className={cn(
								'home-calendar-day',
								isToday && 'today',
								hasEvent && 'has-event'
							)}
						>
							{day}
						</div>
					);
				})}
			</div>

			{events.length > 0 && (
				<div className="mt-5 pt-4 border-t border-[var(--home-border-subtle)]">
					<p className="text-xs font-semibold uppercase tracking-wider text-[var(--home-text-muted)] mb-3">
						Upcoming
					</p>
					{events.slice(0, 3).map((event) => (
						<div key={event.id} className="flex items-center gap-3 py-2">
							<div
								className="w-2.5 h-2.5 rounded-full shrink-0"
								style={{ background: event.color || 'var(--home-gold)' }}
							/>
							<span className="text-sm text-[var(--home-text-secondary)] flex-1 truncate">
								{event.title}
							</span>
							<span className="text-xs text-[var(--home-text-muted)] tabular-nums">
								{formatRelativeDate(event.date)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function ActivityFeedPanel({ activity }: { activity: ActivityEvent[] }) {
	const { openModal } = useStore();

	const getActivityIcon = (type: ActivityEvent['type']) => {
		switch (type) {
			case 'view': return Eye;
			case 'edit': return Pencil;
			case 'share': return Share2;
			case 'upload': return Upload;
			case 'comment': return MessageSquare;
			case 'approve': return CheckCircle2;
			case 'reject': return AlertCircle;
			default: return Clock;
		}
	};

	return (
		<div className="home-card overflow-hidden">
			<div className="home-section-header px-5 pt-5 pb-3">
				<div className="flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-[var(--home-accent)]" />
					<h2 className="home-section-title">Recent Activity</h2>
				</div>
				<button
					className="home-section-action"
					onClick={() => openModal('activity-history')}
				>
					View All
				</button>
			</div>

			{activity.length === 0 ? (
				<div className="home-empty py-8">
					<div className="home-empty-icon">
						<Clock className="w-6 h-6" />
					</div>
					<p className="home-empty-title">No recent activity</p>
					<p className="home-empty-description">Your actions will appear here</p>
				</div>
			) : (
				<div className="px-5 pb-4">
					{activity.slice(0, 6).map((event) => {
						const Icon = getActivityIcon(event.type);
						return (
							<div key={event.id} className="home-activity-item">
								<div className={cn('home-activity-icon', event.type)}>
									<Icon className="w-4 h-4" />
								</div>
								<div className="flex-1 min-w-0 pt-0.5">
									<p className="text-sm text-[var(--home-text-secondary)] leading-relaxed">
										<span className="font-medium text-[var(--home-text-primary)]">
											{event.actor?.name || 'You'}
										</span>
										{' '}{event.title}
									</p>
									<p className="text-xs text-[var(--home-text-muted)] mt-1">
										{formatRelativeDate(event.timestamp)}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function NotificationsDrawer({ notifications, onClose }: {
	notifications: Notification[];
	onClose: () => void;
}) {
	const markRead = useMarkNotificationRead();
	const unreadCount = notifications.filter(n => !n.is_read).length;

	const getNotificationIcon = (type: Notification['type']) => {
		switch (type) {
			case 'task': return Inbox;
			case 'mention': return MessageSquare;
			case 'share': return Share2;
			case 'comment': return MessageSquare;
			case 'deadline': return AlertCircle;
			default: return Bell;
		}
	};

	return (
		<>
			<div className="home-drawer-backdrop" onClick={onClose} />

			<div className="home-drawer">
				<div className="flex items-center justify-between p-5 border-b border-[var(--home-border-subtle)]">
					<div>
						<h2 className="text-lg font-semibold text-[var(--home-text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
							Notifications
						</h2>
						{unreadCount > 0 && (
							<p className="text-xs text-[var(--home-text-muted)] mt-0.5">
								{unreadCount} unread
							</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="p-2 rounded-lg hover:bg-[var(--home-bg-hover)] text-[var(--home-text-tertiary)] transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="flex-1 overflow-auto">
					{notifications.length === 0 ? (
						<div className="home-empty py-16">
							<div className="home-empty-icon">
								<Bell className="w-7 h-7" />
							</div>
							<p className="home-empty-title">No notifications</p>
							<p className="home-empty-description">You're all caught up!</p>
						</div>
					) : (
						<div>
							{notifications.map((notification, i) => {
								const Icon = getNotificationIcon(notification.type);
								return (
									<button
										key={notification.id}
										className={cn(
											'w-full flex items-start gap-4 p-5 text-left border-b border-[var(--home-border-subtle)] hover:bg-[var(--home-bg-hover)] transition-colors',
											!notification.is_read && 'bg-[var(--home-accent-subtle)]'
										)}
										onClick={() => !notification.is_read && markRead.mutate(notification.id)}
										style={{ animationDelay: `${i * 30}ms` }}
									>
										<div className={cn(
											'p-2.5 rounded-xl shrink-0',
											notification.type === 'deadline'
												? 'bg-[var(--home-error-muted)] text-[var(--home-error)]'
												: 'bg-[var(--home-accent-muted)] text-[var(--home-accent)]'
										)}>
											<Icon className="w-4 h-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className={cn(
												'text-sm leading-snug',
												!notification.is_read
													? 'font-medium text-[var(--home-text-primary)]'
													: 'text-[var(--home-text-secondary)]'
											)}>
												{notification.title}
											</p>
											<p className="text-xs text-[var(--home-text-tertiary)] mt-1.5 line-clamp-2">
												{notification.message}
											</p>
											<p className="text-xs text-[var(--home-text-muted)] mt-2">
												{formatRelativeDate(notification.created_at)}
											</p>
										</div>
										{!notification.is_read && (
											<div className="w-2.5 h-2.5 rounded-full bg-[var(--home-accent)] shrink-0 mt-1" />
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>

				{notifications.length > 0 && (
					<div className="p-4 border-t border-[var(--home-border-subtle)] bg-[var(--home-bg-muted)]">
						<Button variant="outline" size="sm" className="w-full font-medium">
							Mark All as Read
						</Button>
					</div>
				)}
			</div>
		</>
	);
}

function HomePageSkeleton() {
	return (
		<div className="home-root min-h-screen">
			<div className="max-w-[1680px] mx-auto px-8 py-8">
				{/* Header */}
				<div className="flex items-start justify-between mb-10">
					<div>
						<div className="h-10 w-80 home-skeleton rounded-lg" />
						<div className="h-5 w-64 home-skeleton rounded-lg mt-3" />
					</div>
					<div className="flex gap-3">
						<div className="h-10 w-10 home-skeleton rounded-xl" />
						<div className="h-10 w-32 home-skeleton rounded-xl" />
						<div className="h-10 w-28 home-skeleton rounded-xl" />
					</div>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-4 gap-5 mb-10">
					{[1, 2, 3, 4].map(i => (
						<div key={i} className="home-card p-5 h-[88px]">
							<div className="flex items-center gap-5">
								<div className="w-11 h-11 home-skeleton rounded-xl" />
								<div className="flex-1">
									<div className="h-8 w-12 home-skeleton rounded" />
									<div className="h-3 w-24 home-skeleton rounded mt-2" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Content */}
				<div className="grid grid-cols-12 gap-6">
					<div className="col-span-8 space-y-6">
						<div className="h-14 home-skeleton rounded-xl" />
						<div className="home-card h-80" />
						<div className="home-card h-64" />
					</div>
					<div className="col-span-4 space-y-6">
						<div className="home-card h-56" />
						<div className="home-card h-72" />
						<div className="home-card h-64" />
					</div>
				</div>
			</div>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return 'Good morning';
	if (hour < 17) return 'Good afternoon';
	return 'Good evening';
}

function getDateString(): string {
	return new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
	});
}

function formatRelativeDate(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
