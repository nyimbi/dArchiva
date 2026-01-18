// Scanner Dashboard - Control Room Overview
import { cn } from '@/lib/utils';
import { TechPanel, Readout, Gauge, ActivityDisplay, TechButton, GridOverlay } from './core/TechPanel';
import { StatusLED, StatusBadge } from './core/StatusLED';
import { ScannerCard, ScannerMiniCard } from './ScannerCard';
import { useScannerDashboard, useScanJobs } from '../api/hooks';
import type { Scanner, ScanJob, ScannerStatus } from '../types';
import {
	PrinterIcon,
	DocumentDuplicateIcon,
	ClockIcon,
	ExclamationTriangleIcon,
	ArrowTrendingUpIcon,
	CheckCircleIcon,
	XCircleIcon,
} from '@heroicons/react/24/outline';
import '../styles/theme.css';

interface ScannerDashboardProps {
	onScannerSelect?: (scanner: Scanner) => void;
	onScanJobSelect?: (job: ScanJob) => void;
	className?: string;
}

export function ScannerDashboard({ onScannerSelect, onScanJobSelect, className }: ScannerDashboardProps) {
	const { data: dashboard, isLoading, error } = useScannerDashboard();
	const { data: recentJobs } = useScanJobs({ limit: 5 });

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<div className="scan-activity w-48 mb-4">
						<div className="scan-activity-wave" />
					</div>
					<span className="font-mono text-xs text-[var(--scan-text-muted)] uppercase">
						Loading scanner data...
					</span>
				</div>
			</div>
		);
	}

	if (error || !dashboard) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center text-red-400">
					<ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
					<span className="font-mono text-sm">Failed to load dashboard</span>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('relative min-h-screen', className)}>
			<GridOverlay className="fixed" />

			<div className="relative z-10 p-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-[var(--scan-text-bright)] font-[var(--font-sans)]">
							Scanner Control
						</h1>
						<p className="text-sm text-[var(--scan-text-muted)] font-mono">
							// DEVICE MANAGEMENT DASHBOARD
						</p>
					</div>
					<div className="flex items-center gap-2">
						<ActivityDisplay active={dashboard.busy_scanners > 0} className="w-32" />
					</div>
				</div>

				{/* Status Overview */}
				<div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
					<StatusCounter
						label="Total Scanners"
						value={dashboard.total_scanners}
						icon={<PrinterIcon className="w-5 h-5" />}
					/>
					<StatusCounter
						label="Online"
						value={dashboard.online_scanners}
						icon={<CheckCircleIcon className="w-5 h-5" />}
						variant="success"
					/>
					<StatusCounter
						label="Offline"
						value={dashboard.offline_scanners}
						icon={<XCircleIcon className="w-5 h-5" />}
						variant="muted"
					/>
					<StatusCounter
						label="Busy"
						value={dashboard.busy_scanners}
						icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
						variant="warning"
					/>
					<StatusCounter
						label="Pages Today"
						value={dashboard.total_pages_today}
						icon={<DocumentDuplicateIcon className="w-5 h-5" />}
						variant="accent"
					/>
					<StatusCounter
						label="Jobs Today"
						value={dashboard.total_jobs_today}
						icon={<ClockIcon className="w-5 h-5" />}
						variant="accent"
					/>
				</div>

				<div className="grid lg:grid-cols-3 gap-6">
					{/* Scanner Fleet */}
					<div className="lg:col-span-2">
						<TechPanel title="Scanner Fleet" subtitle={`${dashboard.scanners.length} devices`}>
							{dashboard.scanners.length === 0 ? (
								<div className="text-center py-8 text-[var(--scan-text-muted)]">
									<PrinterIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
									<p className="text-sm">No scanners registered</p>
								</div>
							) : (
								<div className="grid sm:grid-cols-2 gap-4 scan-stagger">
									{dashboard.scanners.map((scanner) => (
										<ScannerCard
											key={scanner.id}
											scanner={scanner}
											onClick={() => onScannerSelect?.(scanner)}
										/>
									))}
								</div>
							)}
						</TechPanel>
					</div>

					{/* Right Sidebar */}
					<div className="space-y-6">
						{/* Quick Access */}
						<TechPanel title="Quick Access">
							<div className="space-y-2">
								{dashboard.scanners
									.filter((s) => s.status === 'online')
									.slice(0, 4)
									.map((scanner) => (
										<ScannerMiniCard
											key={scanner.id}
											scanner={scanner}
											onClick={() => onScannerSelect?.(scanner)}
										/>
									))}
								{dashboard.online_scanners === 0 && (
									<p className="text-xs text-[var(--scan-text-muted)] text-center py-4">
										No scanners online
									</p>
								)}
							</div>
						</TechPanel>

						{/* Recent Jobs */}
						<TechPanel title="Recent Jobs" subtitle="Last 5">
							{recentJobs && recentJobs.length > 0 ? (
								<div className="space-y-2 scan-stagger">
									{recentJobs.map((job) => (
										<JobRow
											key={job.id}
											job={job}
											onClick={() => onScanJobSelect?.(job)}
										/>
									))}
								</div>
							) : (
								<p className="text-xs text-[var(--scan-text-muted)] text-center py-4">
									No recent jobs
								</p>
							)}
						</TechPanel>

						{/* Usage Stats */}
						{dashboard.usage_stats.length > 0 && (
							<TechPanel title="Utilization">
								<div className="space-y-3">
									{dashboard.usage_stats.slice(0, 3).map((stat) => (
										<div key={stat.scanner_id}>
											<div className="flex justify-between text-xs mb-1">
												<span className="text-[var(--scan-text-secondary)] truncate">
													{stat.scanner_name}
												</span>
												<span className="font-mono text-[var(--scan-text-muted)]">
													{stat.uptime_percentage.toFixed(0)}%
												</span>
											</div>
											<Gauge
												value={stat.uptime_percentage}
												variant={
													stat.uptime_percentage > 90
														? 'success'
														: stat.uptime_percentage > 50
														? 'default'
														: 'warning'
												}
											/>
										</div>
									))}
								</div>
							</TechPanel>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

interface StatusCounterProps {
	label: string;
	value: number;
	icon: React.ReactNode;
	variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'muted';
}

function StatusCounter({ label, value, icon, variant = 'default' }: StatusCounterProps) {
	const variantClasses = {
		default: 'text-[var(--scan-text-primary)]',
		success: 'text-emerald-400',
		warning: 'text-amber-400',
		error: 'text-red-400',
		accent: 'text-[var(--scan-accent)]',
		muted: 'text-[var(--scan-text-muted)]',
	};

	return (
		<div className="scan-panel p-4">
			<div className="flex items-center gap-2 mb-2">
				<span className={cn('opacity-60', variantClasses[variant])}>{icon}</span>
				<span className="text-[10px] text-[var(--scan-text-muted)] font-mono uppercase tracking-wider">
					{label}
				</span>
			</div>
			<div className={cn('text-3xl font-mono font-bold', variantClasses[variant])}>
				{value.toLocaleString()}
			</div>
		</div>
	);
}

interface JobRowProps {
	job: ScanJob;
	onClick?: () => void;
}

function JobRow({ job, onClick }: JobRowProps) {
	const statusColors: Record<string, string> = {
		completed: 'text-emerald-400',
		failed: 'text-red-400',
		cancelled: 'text-gray-400',
		scanning: 'text-amber-400',
		processing: 'text-[var(--scan-accent)]',
		pending: 'text-[var(--scan-text-muted)]',
	};

	return (
		<button
			className={cn(
				'w-full flex items-center gap-3 p-2 rounded text-left transition-all',
				'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
				'hover:border-[var(--scan-border-active)]'
			)}
			onClick={onClick}
		>
			<div
				className={cn(
					'w-2 h-2 rounded-full',
					job.status === 'scanning' || job.status === 'processing' ? 'led-busy' : '',
					job.status === 'completed' && 'bg-emerald-400',
					job.status === 'failed' && 'bg-red-400',
					job.status === 'pending' && 'bg-gray-400',
					job.status === 'cancelled' && 'bg-gray-500'
				)}
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 text-xs">
					<span className={cn('font-mono uppercase', statusColors[job.status])}>
						{job.status}
					</span>
					<span className="text-[var(--scan-text-muted)]">•</span>
					<span className="text-[var(--scan-text-secondary)]">
						{job.pages_scanned} pages
					</span>
				</div>
			</div>
			<span className="text-[10px] text-[var(--scan-text-muted)]">
				{new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
			</span>
		</button>
	);
}
