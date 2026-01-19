// (c) Copyright Datacraft, 2026
/**
 * Security metrics dashboard cards with analytics.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import type { PolicyAnalytics } from '../types';
import { fetchPolicyAnalytics } from '../api';

const cardVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: (i: number) => ({
		opacity: 1, y: 0,
		transition: { delay: i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
	})
};

interface MetricCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ReactNode;
	trend?: { value: number; positive: boolean };
	variant?: 'default' | 'success' | 'danger' | 'warning';
	index: number;
}

function MetricCard({ title, value, subtitle, icon, trend, variant = 'default', index }: MetricCardProps) {
	const variantStyles = {
		default: 'bg-parchment border-charcoal/10',
		success: 'bg-sage/10 border-sage/30',
		danger: 'bg-terracotta/10 border-terracotta/30',
		warning: 'bg-gold/10 border-gold/30',
	};

	const iconStyles = {
		default: 'text-charcoal/60',
		success: 'text-sage',
		danger: 'text-terracotta',
		warning: 'text-gold',
	};

	return (
		<motion.div
			custom={index}
			variants={cardVariants}
			initial="hidden"
			animate="visible"
			className={`relative overflow-hidden rounded-lg border-2 p-5 ${variantStyles[variant]}`}
		>
			{/* Decorative corner */}
			<div className="absolute -right-3 -top-3 h-16 w-16 rotate-45 bg-gradient-to-br from-transparent to-charcoal/5" />

			<div className="flex items-start justify-between">
				<div className="flex-1">
					<p className="font-['DM_Sans'] text-xs font-medium uppercase tracking-wider text-charcoal/50">
						{title}
					</p>
					<p className="mt-2 font-['Newsreader'] text-3xl font-semibold text-charcoal">
						{value}
					</p>
					{subtitle && (
						<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/60">{subtitle}</p>
					)}
					{trend && (
						<div className={`mt-2 flex items-center gap-1 text-sm ${trend.positive ? 'text-sage' : 'text-terracotta'}`}>
							<TrendingUp className={`h-3 w-3 ${!trend.positive && 'rotate-180'}`} />
							<span className="font-['DM_Sans']">{trend.value}%</span>
						</div>
					)}
				</div>
				<div className={`rounded-full p-3 ${iconStyles[variant]} bg-cream/50`}>
					{icon}
				</div>
			</div>
		</motion.div>
	);
}

interface TopDeniedActionsProps {
	actions: { action: string; count: number }[];
}

function TopDeniedActions({ actions }: TopDeniedActionsProps) {
	const maxCount = Math.max(...actions.map(a => a.count), 1);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.5 }}
			className="rounded-lg border-2 border-charcoal/10 bg-parchment p-5"
		>
			<div className="mb-4 flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 text-terracotta" />
				<h3 className="font-['Newsreader'] text-lg font-semibold text-charcoal">
					Top Denied Actions
				</h3>
			</div>

			<div className="space-y-3">
				{actions.length === 0 ? (
					<p className="font-['DM_Sans'] text-sm text-charcoal/50 italic">
						No denied actions today
					</p>
				) : (
					actions.map((item, i) => (
						<div key={item.action} className="group">
							<div className="mb-1 flex items-center justify-between">
								<span className="font-['DM_Sans'] text-sm font-medium text-charcoal">
									{item.action}
								</span>
								<span className="font-['DM_Sans'] text-sm tabular-nums text-terracotta">
									{item.count}
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-cream">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${(item.count / maxCount) * 100}%` }}
									transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
									className="h-full rounded-full bg-gradient-to-r from-terracotta to-terracotta/70"
								/>
							</div>
						</div>
					))
				)}
			</div>
		</motion.div>
	);
}

interface AllowDenyRingProps {
	allowRate: number;
	denyRate: number;
}

function AllowDenyRing({ allowRate, denyRate }: AllowDenyRingProps) {
	const radius = 45;
	const circumference = 2 * Math.PI * radius;
	const allowStroke = (allowRate / 100) * circumference;
	const denyStroke = (denyRate / 100) * circumference;

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: 0.4 }}
			className="rounded-lg border-2 border-charcoal/10 bg-parchment p-5"
		>
			<h3 className="mb-4 font-['Newsreader'] text-lg font-semibold text-charcoal">
				Decision Distribution
			</h3>

			<div className="flex items-center justify-center gap-8">
				<div className="relative h-32 w-32">
					<svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
						{/* Background circle */}
						<circle
							cx="50" cy="50" r={radius}
							fill="none"
							stroke="currentColor"
							strokeWidth="8"
							className="text-cream"
						/>
						{/* Allow segment */}
						<motion.circle
							cx="50" cy="50" r={radius}
							fill="none"
							stroke="currentColor"
							strokeWidth="8"
							strokeDasharray={`${allowStroke} ${circumference}`}
							strokeLinecap="round"
							className="text-sage"
							initial={{ strokeDashoffset: circumference }}
							animate={{ strokeDashoffset: 0 }}
							transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
						/>
						{/* Deny segment */}
						<motion.circle
							cx="50" cy="50" r={radius}
							fill="none"
							stroke="currentColor"
							strokeWidth="8"
							strokeDasharray={`${denyStroke} ${circumference}`}
							strokeDashoffset={-allowStroke}
							strokeLinecap="round"
							className="text-terracotta"
							initial={{ strokeDashoffset: circumference }}
							animate={{ strokeDashoffset: -allowStroke }}
							transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
						/>
					</svg>
					<div className="absolute inset-0 flex items-center justify-center">
						<Shield className="h-8 w-8 text-charcoal/30" />
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<div className="h-3 w-3 rounded-full bg-sage" />
						<span className="font-['DM_Sans'] text-sm text-charcoal">
							Allow: <strong>{allowRate.toFixed(1)}%</strong>
						</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="h-3 w-3 rounded-full bg-terracotta" />
						<span className="font-['DM_Sans'] text-sm text-charcoal">
							Deny: <strong>{denyRate.toFixed(1)}%</strong>
						</span>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

export function SecurityMetrics() {
	const [analytics, setAnalytics] = useState<PolicyAnalytics | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchPolicyAnalytics()
			.then(setAnalytics)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="h-32 animate-pulse rounded-lg bg-parchment" />
				))}
			</div>
		);
	}

	if (!analytics) {
		return (
			<div className="rounded-lg border-2 border-charcoal/10 bg-parchment p-8 text-center">
				<p className="font-['DM_Sans'] text-charcoal/60">Unable to load analytics</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Primary Metrics */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MetricCard
					index={0}
					title="Active Policies"
					value={analytics.active_policies}
					subtitle={`of ${analytics.total_policies} total`}
					icon={<Shield className="h-5 w-5" />}
				/>
				<MetricCard
					index={1}
					title="Evaluations Today"
					value={analytics.evaluations_today.toLocaleString()}
					icon={<Activity className="h-5 w-5" />}
				/>
				<MetricCard
					index={2}
					title="Pending Approvals"
					value={analytics.pending_approvals}
					variant={analytics.pending_approvals > 0 ? 'warning' : 'default'}
					icon={<Clock className="h-5 w-5" />}
				/>
				<MetricCard
					index={3}
					title="Avg Latency"
					value={`${analytics.evaluation_latency_avg_ms.toFixed(1)}ms`}
					variant={analytics.evaluation_latency_avg_ms > 50 ? 'warning' : 'success'}
					icon={<TrendingUp className="h-5 w-5" />}
				/>
			</div>

			{/* Secondary Analytics */}
			<div className="grid gap-4 lg:grid-cols-2">
				<AllowDenyRing allowRate={analytics.allow_rate} denyRate={analytics.deny_rate} />
				<TopDeniedActions actions={analytics.top_denied_actions} />
			</div>
		</div>
	);
}
