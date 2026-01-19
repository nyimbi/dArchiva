// (c) Copyright Datacraft, 2026
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
	BrainCircuit,
	AlertTriangle,
	CheckCircle,
	Clock,
	TrendingUp,
	TrendingDown,
	Users,
	Printer,
	Zap,
	ChevronDown,
	ChevronRight,
	RefreshCw,
	Target,
	Shield,
	Gauge,
	Calendar,
	ArrowRight,
	Sparkles,
	Activity,
	BarChart3,
	History,
	Play,
	XCircle,
} from 'lucide-react';

// Types matching backend views.py
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type RecommendationType = 'resource_allocation' | 'scheduling' | 'quality_improvement' | 'risk_mitigation' | 'efficiency';

interface AIRecommendation {
	id: string;
	type: RecommendationType;
	title: string;
	description: string;
	priority: number;
	riskLevel: RiskLevel;
	estimatedImpact: string | null;
	actionItems: string[];
	createdAt: string;
}

interface ProjectRiskAssessment {
	projectId: string;
	overallRiskLevel: RiskLevel;
	scheduleRisk: RiskLevel;
	qualityRisk: RiskLevel;
	resourceRisk: RiskLevel;
	riskFactors: string[];
	mitigationSuggestions: string[];
	confidenceScore: number;
	assessedAt: string;
}

interface ScheduleForecast {
	projectId: string;
	targetDate: string;
	predictedCompletionDate: string;
	onTrack: boolean;
	daysAheadOrBehind: number;
	confidenceScore: number;
	bottlenecks: string[];
	recommendations: string[];
	forecastedAt: string;
}

interface ResourceOptimization {
	projectId: string;
	currentEfficiency: number;
	optimalOperatorCount: number;
	optimalScannerCount: number;
	suggestedScheduleChanges: string[];
	underutilizedResources: string[];
	overloadedResources: string[];
	estimatedEfficiencyGain: number;
	analyzedAt: string;
}

interface AIAdvisorResponse {
	projectId: string;
	riskAssessment: ProjectRiskAssessment;
	scheduleForecast: ScheduleForecast;
	resourceOptimization: ResourceOptimization;
	recommendations: AIRecommendation[];
	summary: string;
	generatedAt: string;
}

interface PredictionAccuracy {
	metric: string;
	predicted: number;
	actual: number;
	accuracy: number;
	date: string;
}

interface AIAdvisorPanelProps {
	projectId: string;
	className?: string;
}

const BASE_URL = '/scanning-projects';

// API hooks
function useAIAdvisor(projectId: string) {
	return useQuery({
		queryKey: ['ai-advisor', projectId],
		queryFn: async () => {
			const res = await apiClient.get<AIAdvisorResponse>(`${BASE_URL}/${projectId}/ai-advisor`);
			return res.data;
		},
		enabled: !!projectId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

function useRequestAnalysis(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const res = await apiClient.post<AIAdvisorResponse>(`${BASE_URL}/${projectId}/ai-advisor/analyze`);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['ai-advisor', projectId] });
		},
	});
}

function usePredictionHistory(projectId: string) {
	return useQuery({
		queryKey: ['ai-advisor-history', projectId],
		queryFn: async () => {
			const res = await apiClient.get<PredictionAccuracy[]>(`${BASE_URL}/${projectId}/ai-advisor/history`);
			return res.data;
		},
		enabled: !!projectId,
	});
}

function useApplyRecommendation(projectId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (recommendationId: string) => {
			await apiClient.post(`${BASE_URL}/${projectId}/ai-advisor/recommendations/${recommendationId}/apply`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['ai-advisor', projectId] });
		},
	});
}

// Risk level configuration
const riskConfig: Record<RiskLevel, { color: string; bgColor: string; borderColor: string; label: string }> = {
	low: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', label: 'Low Risk' },
	medium: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', label: 'Medium Risk' },
	high: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', label: 'High Risk' },
	critical: { color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30', label: 'Critical Risk' },
};

// Recommendation type configuration
const recTypeConfig: Record<RecommendationType, { icon: typeof Users; label: string; color: string }> = {
	resource_allocation: { icon: Users, label: 'Resource', color: 'text-blue-400' },
	scheduling: { icon: Calendar, label: 'Scheduling', color: 'text-purple-400' },
	quality_improvement: { icon: Shield, label: 'Quality', color: 'text-emerald-400' },
	risk_mitigation: { icon: AlertTriangle, label: 'Risk', color: 'text-amber-400' },
	efficiency: { icon: Zap, label: 'Efficiency', color: 'text-cyan-400' },
};

// Risk Score Gauge Component
function RiskScoreGauge({ riskLevel, confidenceScore }: { riskLevel: RiskLevel; confidenceScore: number }) {
	const riskScores: Record<RiskLevel, number> = { low: 25, medium: 50, high: 75, critical: 95 };
	const score = riskScores[riskLevel];
	const config = riskConfig[riskLevel];

	// Calculate stroke dash for circular progress
	const circumference = 2 * Math.PI * 45; // radius = 45
	const strokeDash = (score / 100) * circumference;

	return (
		<div className="flex flex-col items-center">
			<div className="relative w-32 h-32">
				<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
					{/* Background circle */}
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						strokeWidth="8"
						className="text-slate-800"
					/>
					{/* Progress circle */}
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						strokeWidth="8"
						strokeLinecap="round"
						strokeDasharray={`${strokeDash} ${circumference}`}
						className={config.color}
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className={cn('text-3xl font-bold', config.color)}>{score}</span>
					<span className="text-xs text-slate-500">Risk Score</span>
				</div>
			</div>
			<div className={cn('mt-2 px-3 py-1 rounded-full text-sm font-medium', config.bgColor, config.color)}>
				{config.label}
			</div>
			<div className="mt-1 text-xs text-slate-500">
				{Math.round(confidenceScore * 100)}% confidence
			</div>
		</div>
	);
}

// Risk Breakdown Card
function RiskBreakdownCard({ assessment }: { assessment: ProjectRiskAssessment }) {
	const risks = [
		{ label: 'Schedule', level: assessment.scheduleRisk, icon: Clock },
		{ label: 'Quality', level: assessment.qualityRisk, icon: Shield },
		{ label: 'Resource', level: assessment.resourceRisk, icon: Users },
	];

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
				<BarChart3 className="w-4 h-4 text-slate-500" />
				Risk Breakdown
			</h4>
			<div className="space-y-3">
				{risks.map(({ label, level, icon: Icon }) => {
					const config = riskConfig[level];
					const widths: Record<RiskLevel, string> = { low: 'w-1/4', medium: 'w-1/2', high: 'w-3/4', critical: 'w-full' };
					return (
						<div key={label}>
							<div className="flex items-center justify-between mb-1">
								<div className="flex items-center gap-2">
									<Icon className="w-3.5 h-3.5 text-slate-500" />
									<span className="text-sm text-slate-400">{label}</span>
								</div>
								<span className={cn('text-xs font-medium', config.color)}>{level.toUpperCase()}</span>
							</div>
							<div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
								<div className={cn('h-full rounded-full transition-all', widths[level], config.bgColor.replace('/10', '/50'))} />
							</div>
						</div>
					);
				})}
			</div>

			{assessment.riskFactors.length > 0 && (
				<div className="mt-4 pt-4 border-t border-slate-800">
					<h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Risk Factors</h5>
					<ul className="space-y-1">
						{assessment.riskFactors.slice(0, 3).map((factor, i) => (
							<li key={i} className="text-xs text-slate-400 flex items-start gap-2">
								<AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
								{factor}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

// Timeline Forecast Card
function TimelineForecastCard({ forecast }: { forecast: ScheduleForecast }) {
	const targetDate = new Date(forecast.targetDate);
	const predictedDate = new Date(forecast.predictedCompletionDate);
	const daysAhead = forecast.daysAheadOrBehind;
	const isAhead = daysAhead < 0;
	const isBehind = daysAhead > 0;

	const formatDate = (date: Date) =>
		date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

	// Calculate timeline visualization
	const today = new Date();
	const totalDuration = Math.abs(predictedDate.getTime() - today.getTime());
	const elapsedDuration = Math.abs(targetDate.getTime() - today.getTime());
	const progressPercent = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<div className="flex items-center justify-between mb-4">
				<h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
					<Calendar className="w-4 h-4 text-slate-500" />
					Timeline Forecast
				</h4>
				<span className={cn(
					'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
					forecast.onTrack ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
				)}>
					{forecast.onTrack ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
					{forecast.onTrack ? 'On Track' : 'Off Track'}
				</span>
			</div>

			{/* Timeline visualization */}
			<div className="relative mb-4">
				<div className="h-2 bg-slate-800 rounded-full overflow-hidden">
					<div
						className={cn('h-full rounded-full', forecast.onTrack ? 'bg-emerald-500' : 'bg-rose-500')}
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
				<div className="flex justify-between mt-1 text-xs text-slate-500">
					<span>Today</span>
					<span>{formatDate(targetDate)}</span>
				</div>
			</div>

			{/* Dates */}
			<div className="grid grid-cols-2 gap-4 mb-4">
				<div>
					<span className="text-xs text-slate-500 block mb-1">Target Date</span>
					<span className="text-sm font-medium text-slate-300">{formatDate(targetDate)}</span>
				</div>
				<div>
					<span className="text-xs text-slate-500 block mb-1">Predicted</span>
					<span className={cn('text-sm font-medium', forecast.onTrack ? 'text-emerald-400' : 'text-rose-400')}>
						{formatDate(predictedDate)}
					</span>
				</div>
			</div>

			{/* Days ahead/behind indicator */}
			{daysAhead !== 0 && (
				<div className={cn(
					'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
					isAhead ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
				)}>
					{isAhead ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
					<span className="font-medium">{Math.abs(daysAhead)} days {isAhead ? 'ahead' : 'behind'}</span>
					<span className="text-xs opacity-70">of schedule</span>
				</div>
			)}

			{/* Confidence interval */}
			<div className="mt-3 flex items-center justify-between text-xs">
				<span className="text-slate-500">Confidence Interval</span>
				<div className="flex items-center gap-2">
					<div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
						<div
							className="h-full bg-cyan-500 rounded-full"
							style={{ width: `${forecast.confidenceScore * 100}%` }}
						/>
					</div>
					<span className="text-slate-400">{Math.round(forecast.confidenceScore * 100)}%</span>
				</div>
			</div>

			{/* Bottlenecks */}
			{forecast.bottlenecks.length > 0 && (
				<div className="mt-4 pt-4 border-t border-slate-800">
					<h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Bottlenecks</h5>
					<ul className="space-y-1">
						{forecast.bottlenecks.slice(0, 3).map((bottleneck, i) => (
							<li key={i} className="text-xs text-slate-400 flex items-start gap-2">
								<AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
								{bottleneck}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

// Resource Optimization Card
function ResourceOptimizationCard({ optimization }: { optimization: ResourceOptimization }) {
	const efficiencyPercent = Math.round(optimization.currentEfficiency * 100);
	const gainPercent = Math.round(optimization.estimatedEfficiencyGain * 100);

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
				<Activity className="w-4 h-4 text-slate-500" />
				Resource Optimization
			</h4>

			{/* Current efficiency gauge */}
			<div className="flex items-center justify-between mb-4">
				<div>
					<span className="text-xs text-slate-500 block mb-1">Current Efficiency</span>
					<div className="flex items-baseline gap-1">
						<span className={cn(
							'text-2xl font-bold',
							efficiencyPercent >= 80 ? 'text-emerald-400' : efficiencyPercent >= 60 ? 'text-amber-400' : 'text-rose-400'
						)}>
							{efficiencyPercent}%
						</span>
						{gainPercent > 0 && (
							<span className="text-xs text-emerald-400">+{gainPercent}% potential</span>
						)}
					</div>
				</div>
				<div className="w-20 h-20 relative">
					<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
						<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-800" />
						<circle
							cx="50"
							cy="50"
							r="40"
							fill="none"
							stroke="currentColor"
							strokeWidth="10"
							strokeLinecap="round"
							strokeDasharray={`${(efficiencyPercent / 100) * 251.2} 251.2`}
							className={efficiencyPercent >= 80 ? 'text-emerald-500' : efficiencyPercent >= 60 ? 'text-amber-500' : 'text-rose-500'}
						/>
					</svg>
					<Gauge className="absolute inset-0 m-auto w-6 h-6 text-slate-500" />
				</div>
			</div>

			{/* Optimal resources */}
			<div className="grid grid-cols-2 gap-3 mb-4">
				<div className="bg-slate-800/50 rounded-lg p-3">
					<div className="flex items-center gap-2 mb-1">
						<Users className="w-4 h-4 text-blue-400" />
						<span className="text-xs text-slate-500">Optimal Operators</span>
					</div>
					<span className="text-xl font-bold text-slate-200">{optimization.optimalOperatorCount}</span>
				</div>
				<div className="bg-slate-800/50 rounded-lg p-3">
					<div className="flex items-center gap-2 mb-1">
						<Printer className="w-4 h-4 text-purple-400" />
						<span className="text-xs text-slate-500">Optimal Scanners</span>
					</div>
					<span className="text-xl font-bold text-slate-200">{optimization.optimalScannerCount}</span>
				</div>
			</div>

			{/* Schedule suggestions */}
			{optimization.suggestedScheduleChanges.length > 0 && (
				<div className="mb-4">
					<h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Schedule Suggestions</h5>
					<ul className="space-y-1">
						{optimization.suggestedScheduleChanges.slice(0, 2).map((suggestion, i) => (
							<li key={i} className="text-xs text-slate-400 flex items-start gap-2">
								<Sparkles className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
								{suggestion}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Resource utilization */}
			{(optimization.underutilizedResources.length > 0 || optimization.overloadedResources.length > 0) && (
				<div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
					{optimization.underutilizedResources.length > 0 && (
						<div>
							<h5 className="text-xs font-medium text-amber-400 mb-2">Underutilized</h5>
							<ul className="space-y-1">
								{optimization.underutilizedResources.slice(0, 2).map((resource, i) => (
									<li key={i} className="text-xs text-slate-400 truncate">{resource}</li>
								))}
							</ul>
						</div>
					)}
					{optimization.overloadedResources.length > 0 && (
						<div>
							<h5 className="text-xs font-medium text-rose-400 mb-2">Overloaded</h5>
							<ul className="space-y-1">
								{optimization.overloadedResources.slice(0, 2).map((resource, i) => (
									<li key={i} className="text-xs text-slate-400 truncate">{resource}</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// Recommendation Card
function RecommendationCard({
	recommendation,
	onApply,
	isApplying,
}: {
	recommendation: AIRecommendation;
	onApply: () => void;
	isApplying: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const typeConfig = recTypeConfig[recommendation.type];
	const riskConf = riskConfig[recommendation.riskLevel];
	const TypeIcon = typeConfig.icon;

	return (
		<div className={cn(
			'bg-slate-900 border rounded-lg overflow-hidden transition-colors',
			recommendation.priority <= 3 ? 'border-rose-500/30' : recommendation.priority <= 5 ? 'border-amber-500/30' : 'border-slate-800'
		)}>
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-800/30 transition-colors"
			>
				<div className={cn('p-2 rounded-lg', riskConf.bgColor)}>
					<TypeIcon className={cn('w-4 h-4', typeConfig.color)} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', typeConfig.color, 'bg-slate-800')}>
							{typeConfig.label}
						</span>
						<span className={cn(
							'text-xs font-mono px-1.5 py-0.5 rounded',
							recommendation.priority <= 3 ? 'bg-rose-500/20 text-rose-400' :
							recommendation.priority <= 5 ? 'bg-amber-500/20 text-amber-400' :
							'bg-slate-700 text-slate-400'
						)}>
							P{recommendation.priority}
						</span>
					</div>
					<h4 className="text-sm font-medium text-slate-200 truncate">{recommendation.title}</h4>
					<p className="text-xs text-slate-500 mt-1 line-clamp-2">{recommendation.description}</p>
				</div>
				{expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
			</button>

			{expanded && (
				<div className="px-4 pb-4 pt-0 border-t border-slate-800">
					{recommendation.estimatedImpact && (
						<div className="mb-3 mt-3">
							<h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Expected Impact</h5>
							<p className="text-sm text-slate-300">{recommendation.estimatedImpact}</p>
						</div>
					)}

					{recommendation.actionItems.length > 0 && (
						<div className="mb-4">
							<h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Action Items</h5>
							<ul className="space-y-2">
								{recommendation.actionItems.map((item, i) => (
									<li key={i} className="flex items-start gap-2 text-sm text-slate-400">
										<ArrowRight className="w-3 h-3 text-cyan-400 mt-1 shrink-0" />
										{item}
									</li>
								))}
							</ul>
						</div>
					)}

					<button
						onClick={(e) => { e.stopPropagation(); onApply(); }}
						disabled={isApplying}
						className={cn(
							'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
							'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30',
							isApplying && 'opacity-50 cursor-not-allowed'
						)}
					>
						{isApplying ? (
							<RefreshCw className="w-4 h-4 animate-spin" />
						) : (
							<Play className="w-4 h-4" />
						)}
						{isApplying ? 'Applying...' : 'Apply Recommendation'}
					</button>
				</div>
			)}
		</div>
	);
}

// Prediction History Card
function PredictionHistoryCard({ history }: { history: PredictionAccuracy[] }) {
	if (!history || history.length === 0) {
		return (
			<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
				<h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
					<History className="w-4 h-4 text-slate-500" />
					Prediction History
				</h4>
				<p className="text-sm text-slate-500 text-center py-4">No historical data available yet</p>
			</div>
		);
	}

	const averageAccuracy = history.reduce((sum, h) => sum + h.accuracy, 0) / history.length;

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
					<History className="w-4 h-4 text-slate-500" />
					Prediction Accuracy
				</h4>
				<span className={cn(
					'text-lg font-bold',
					averageAccuracy >= 80 ? 'text-emerald-400' : averageAccuracy >= 60 ? 'text-amber-400' : 'text-rose-400'
				)}>
					{Math.round(averageAccuracy)}%
				</span>
			</div>

			<div className="space-y-2">
				{history.slice(0, 5).map((record, i) => (
					<div key={i} className="flex items-center justify-between text-sm">
						<span className="text-slate-400 truncate flex-1">{record.metric}</span>
						<div className="flex items-center gap-2">
							<span className="text-slate-500 text-xs">{record.predicted} vs {record.actual}</span>
							<span className={cn(
								'font-mono text-xs px-1.5 py-0.5 rounded',
								record.accuracy >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
								record.accuracy >= 70 ? 'bg-amber-500/20 text-amber-400' :
								'bg-rose-500/20 text-rose-400'
							)}>
								{Math.round(record.accuracy)}%
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// Main Component
export function AIAdvisorPanel({ projectId, className }: AIAdvisorPanelProps) {
	const [activeSection, setActiveSection] = useState<'overview' | 'timeline' | 'resources' | 'recommendations'>('overview');

	const { data: advisor, isLoading, error } = useAIAdvisor(projectId);
	const { data: history } = usePredictionHistory(projectId);
	const requestAnalysis = useRequestAnalysis(projectId);
	const applyRecommendation = useApplyRecommendation(projectId);

	const sortedRecommendations = useMemo(() => {
		if (!advisor?.recommendations) return [];
		return [...advisor.recommendations].sort((a, b) => a.priority - b.priority);
	}, [advisor?.recommendations]);

	if (isLoading) {
		return (
			<div className={cn('bg-slate-900/50 border border-slate-800 rounded-lg p-6', className)}>
				<div className="flex items-center gap-3 mb-6">
					<div className="w-10 h-10 bg-slate-800 rounded-lg animate-pulse" />
					<div className="flex-1">
						<div className="h-5 w-32 bg-slate-800 rounded animate-pulse mb-2" />
						<div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="h-48 bg-slate-800 rounded-lg animate-pulse" />
					<div className="h-48 bg-slate-800 rounded-lg animate-pulse" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={cn('bg-slate-900/50 border border-rose-500/30 rounded-lg p-6', className)}>
				<div className="flex items-center gap-3 text-rose-400">
					<AlertTriangle className="w-5 h-5" />
					<span>Failed to load AI advisor data</span>
				</div>
				<button
					onClick={() => requestAnalysis.mutate()}
					className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	if (!advisor) {
		return (
			<div className={cn('bg-slate-900/50 border border-slate-800 rounded-lg p-6', className)}>
				<div className="text-center py-8">
					<BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-slate-300 mb-2">AI Analysis Not Available</h3>
					<p className="text-sm text-slate-500 mb-4">Run an analysis to get AI-powered insights for this project</p>
					<button
						onClick={() => requestAnalysis.mutate()}
						disabled={requestAnalysis.isPending}
						className={cn(
							'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
							'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30',
							requestAnalysis.isPending && 'opacity-50 cursor-not-allowed'
						)}
					>
						{requestAnalysis.isPending ? (
							<RefreshCw className="w-4 h-4 animate-spin" />
						) : (
							<Sparkles className="w-4 h-4" />
						)}
						{requestAnalysis.isPending ? 'Analyzing...' : 'Run AI Analysis'}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden', className)}>
			{/* Header */}
			<div className="p-4 border-b border-slate-800">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg">
							<BrainCircuit className="w-5 h-5 text-cyan-400" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-slate-100">AI Project Advisor</h3>
							<p className="text-xs text-slate-500">
								Last analyzed {new Date(advisor.generatedAt).toLocaleString()}
							</p>
						</div>
					</div>
					<button
						onClick={() => requestAnalysis.mutate()}
						disabled={requestAnalysis.isPending}
						className={cn(
							'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
							'bg-slate-800 text-slate-300 hover:bg-slate-700',
							requestAnalysis.isPending && 'opacity-50 cursor-not-allowed'
						)}
					>
						<RefreshCw className={cn('w-4 h-4', requestAnalysis.isPending && 'animate-spin')} />
						Refresh
					</button>
				</div>

				{/* Summary */}
				<div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
					<p className="text-sm text-slate-300">{advisor.summary}</p>
				</div>

				{/* Section Tabs */}
				<div className="flex gap-1 mt-4">
					{[
						{ id: 'overview', label: 'Overview', icon: Target },
						{ id: 'timeline', label: 'Timeline', icon: Calendar },
						{ id: 'resources', label: 'Resources', icon: Users },
						{ id: 'recommendations', label: 'Actions', icon: Zap },
					].map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							onClick={() => setActiveSection(id as typeof activeSection)}
							className={cn(
								'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
								activeSection === id
									? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
									: 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
							)}
						>
							<Icon className="w-3.5 h-3.5" />
							{label}
							{id === 'recommendations' && sortedRecommendations.length > 0 && (
								<span className="ml-1 px-1.5 py-0.5 text-xs bg-cyan-500/20 rounded">{sortedRecommendations.length}</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				{activeSection === 'overview' && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						{/* Risk Score Gauge */}
						<div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-center">
							<RiskScoreGauge
								riskLevel={advisor.riskAssessment.overallRiskLevel}
								confidenceScore={advisor.riskAssessment.confidenceScore}
							/>
						</div>

						{/* Risk Breakdown */}
						<RiskBreakdownCard assessment={advisor.riskAssessment} />

						{/* Prediction History */}
						<PredictionHistoryCard history={history ?? []} />
					</div>
				)}

				{activeSection === 'timeline' && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<TimelineForecastCard forecast={advisor.scheduleForecast} />

						{/* Mitigation Suggestions */}
						<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
							<h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
								<Shield className="w-4 h-4 text-slate-500" />
								Mitigation Suggestions
							</h4>
							{advisor.riskAssessment.mitigationSuggestions.length > 0 ? (
								<ul className="space-y-2">
									{advisor.riskAssessment.mitigationSuggestions.map((suggestion, i) => (
										<li key={i} className="flex items-start gap-2 text-sm text-slate-400">
											<CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
											{suggestion}
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-slate-500 text-center py-4">No mitigation suggestions at this time</p>
							)}
						</div>
					</div>
				)}

				{activeSection === 'resources' && (
					<ResourceOptimizationCard optimization={advisor.resourceOptimization} />
				)}

				{activeSection === 'recommendations' && (
					<div className="space-y-3">
						{sortedRecommendations.length > 0 ? (
							sortedRecommendations.map(rec => (
								<RecommendationCard
									key={rec.id}
									recommendation={rec}
									onApply={() => applyRecommendation.mutate(rec.id)}
									isApplying={applyRecommendation.isPending}
								/>
							))
						) : (
							<div className="text-center py-8">
								<CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
								<h4 className="text-lg font-medium text-slate-300 mb-2">All Clear</h4>
								<p className="text-sm text-slate-500">No recommendations at this time. Your project is running smoothly.</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
