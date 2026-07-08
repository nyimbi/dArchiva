// (c) Copyright Datacraft, 2026
/**
 * Exception stats widget showing counts by type and severity.
 */
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useExceptionStats } from '../api/hooks';
import type { ExceptionSeverity, ExceptionType } from '../types';
import {
	EXCEPTION_SEVERITY_CONFIG,
	EXCEPTION_TYPE_LABELS,
} from '../types';

export function ExceptionStats() {
	const { data: stats, isLoading } = useExceptionStats();

	if (isLoading) {
		return (
			<div className="glass-card p-4 animate-pulse">
				<div className="h-4 bg-slate-700 rounded w-1/3 mb-4" />
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="h-20 bg-slate-800 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (!stats) return null;

	const summaryCards = [
		{
			label: 'Open',
			value: stats.open,
			icon: AlertCircle,
			color: 'text-slate-300',
			bg: 'bg-slate-500/10',
		},
		{
			label: 'In Progress',
			value: stats.inProgress,
			icon: Clock,
			color: 'text-blue-400',
			bg: 'bg-blue-500/10',
		},
		{
			label: 'Resolved',
			value: stats.resolved,
			icon: CheckCircle2,
			color: 'text-emerald-400',
			bg: 'bg-emerald-500/10',
		},
		{
			label: 'Dismissed',
			value: stats.dismissed,
			icon: XCircle,
			color: 'text-slate-500',
			bg: 'bg-slate-600/10',
		},
	];

	const topTypes = (Object.entries(stats.byType) as [ExceptionType, number][])
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6);

	const totalByType = topTypes.reduce((sum, [, c]) => sum + c, 0);

	return (
		<div className="space-y-4">
			{/* Summary cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				{summaryCards.map((card, i) => {
					const Icon = card.icon;
					return (
						<motion.div
							key={card.label}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.05 }}
							className="glass-card p-4"
						>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs text-slate-500">{card.label}</span>
								<div className={cn('p-1.5 rounded-lg', card.bg)}>
									<Icon className={cn('w-4 h-4', card.color)} />
								</div>
							</div>
							<div className={cn('text-2xl font-bold', card.color)}>
								{card.value.toLocaleString()}
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Breakdown panels */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* By severity */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="glass-card p-4"
				>
					<h3 className="text-sm font-medium text-slate-300 mb-3">By Severity</h3>
					<div className="space-y-2.5">
						{(['critical', 'high', 'medium', 'low'] as ExceptionSeverity[]).map((severity) => {
							const count = stats.bySeverity[severity] ?? 0;
							const total = Object.values(stats.bySeverity).reduce((a, b) => a + b, 0);
							const pct = total > 0 ? (count / total) * 100 : 0;
							const cfg = EXCEPTION_SEVERITY_CONFIG[severity];

							return (
								<div key={severity}>
									<div className="flex items-center justify-between mb-1">
										<span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
										<span className="text-xs text-slate-500">{count}</span>
									</div>
									<div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: `${pct}%` }}
											transition={{ duration: 0.4, delay: 0.1 }}
											className={cn(
												'h-full rounded-full',
												severity === 'critical' ? 'bg-red-500' :
												severity === 'high' ? 'bg-orange-500' :
												severity === 'medium' ? 'bg-yellow-500' :
												'bg-blue-500'
											)}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</motion.div>

				{/* By type */}
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.25 }}
					className="glass-card p-4"
				>
					<h3 className="text-sm font-medium text-slate-300 mb-3">By Type</h3>
					<div className="space-y-2.5">
						{topTypes.length === 0 ? (
							<p className="text-sm text-slate-600 text-center py-4">No exceptions</p>
						) : (
							topTypes.map(([type, count]) => {
								const pct = totalByType > 0 ? (count / totalByType) * 100 : 0;

								return (
									<div key={type}>
										<div className="flex items-center justify-between mb-1">
											<span className="text-xs text-slate-300">
												{EXCEPTION_TYPE_LABELS[type]}
											</span>
											<span className="text-xs text-slate-500">{count}</span>
										</div>
										<div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${pct}%` }}
												transition={{ duration: 0.4, delay: 0.1 }}
												className="h-full bg-brass-500 rounded-full"
											/>
										</div>
									</div>
								);
							})
						)}
					</div>
				</motion.div>
			</div>
		</div>
	);
}
