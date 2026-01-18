// (c) Copyright Datacraft, 2026
/**
 * Policy analyzer for "what-if" access analysis.
 * Simulates access decisions without making changes.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Search,
	Play,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	User,
	FileText,
	Shield,
	Clock,
	ChevronRight,
	HelpCircle,
	Zap,
	BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
	User as UserType,
	PermissionAction,
	AccessRequest,
	AccessDecision,
	PolicyRule,
} from '../types';

interface PolicyAnalyzerProps {
	users: UserType[];
	resources: { id: string; name: string; type: string }[];
	onAnalyze: (request: AccessRequest) => Promise<AccessDecision>;
}

const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'share', 'approve', 'admin'];

interface AnalysisResult {
	request: AccessRequest;
	decision: AccessDecision;
	timestamp: Date;
}

export function PolicyAnalyzer({ users, resources, onAnalyze }: PolicyAnalyzerProps) {
	const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
	const [selectedResource, setSelectedResource] = useState<{ id: string; name: string; type: string } | null>(null);
	const [selectedAction, setSelectedAction] = useState<PermissionAction>('view');
	const [customContext, setCustomContext] = useState<Record<string, string>>({});
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [results, setResults] = useState<AnalysisResult[]>([]);
	const [showContext, setShowContext] = useState(false);

	const [userSearch, setUserSearch] = useState('');
	const [resourceSearch, setResourceSearch] = useState('');

	const filteredUsers = users.filter(
		(u) =>
			u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
			u.email.toLowerCase().includes(userSearch.toLowerCase())
	);

	const filteredResources = resources.filter(
		(r) =>
			r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
			r.type.toLowerCase().includes(resourceSearch.toLowerCase())
	);

	const runAnalysis = useCallback(async () => {
		if (!selectedUser || !selectedResource) return;

		setIsAnalyzing(true);
		try {
			const request: AccessRequest = {
				user: selectedUser,
				resource: selectedResource.id,
				action: selectedAction,
				context: customContext,
			};

			const decision = await onAnalyze(request);

			setResults((prev) => [
				{
					request,
					decision,
					timestamp: new Date(),
				},
				...prev.slice(0, 9), // Keep last 10
			]);
		} finally {
			setIsAnalyzing(false);
		}
	}, [selectedUser, selectedResource, selectedAction, customContext, onAnalyze]);

	const addContextField = useCallback(() => {
		const key = `attribute_${Object.keys(customContext).length + 1}`;
		setCustomContext((prev) => ({ ...prev, [key]: '' }));
	}, [customContext]);

	const updateContextField = useCallback((key: string, value: string) => {
		setCustomContext((prev) => ({ ...prev, [key]: value }));
	}, []);

	const removeContextField = useCallback((key: string) => {
		setCustomContext((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	return (
		<div className="glass-card">
			{/* Header */}
			<div className="p-4 border-b border-slate-700/50">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-brass-500/10">
						<HelpCircle className="w-5 h-5 text-brass-400" />
					</div>
					<div>
						<h2 className="font-display font-semibold text-slate-100">
							Policy Analyzer
						</h2>
						<p className="text-xs text-slate-500 mt-0.5">
							Test access decisions without making changes
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/50">
				{/* Query Builder */}
				<div className="p-4 space-y-4">
					<h3 className="text-sm font-medium text-slate-300 mb-3">Build Query</h3>

					{/* User Selection */}
					<div className="space-y-2">
						<label className="text-xs text-slate-500 uppercase tracking-wider">
							User (Subject)
						</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
							<input
								type="text"
								placeholder="Search users..."
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
								className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
							/>
						</div>
						{userSearch && (
							<div className="max-h-32 overflow-y-auto space-y-1">
								{filteredUsers.slice(0, 5).map((user) => (
									<button
										key={user.id}
										onClick={() => {
											setSelectedUser(user);
											setUserSearch('');
										}}
										className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
									>
										<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
											<User className="w-4 h-4 text-blue-400" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-slate-200 truncate">
												{user.displayName}
											</p>
											<p className="text-xs text-slate-500 truncate">{user.email}</p>
										</div>
									</button>
								))}
							</div>
						)}
						{selectedUser && (
							<div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
								<User className="w-5 h-5 text-blue-400" />
								<div className="flex-1 min-w-0">
									<p className="text-sm text-slate-200">{selectedUser.displayName}</p>
									<p className="text-xs text-slate-500">{selectedUser.email}</p>
								</div>
								<button
									onClick={() => setSelectedUser(null)}
									className="text-slate-500 hover:text-slate-300"
								>
									<XCircle className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>

					{/* Resource Selection */}
					<div className="space-y-2">
						<label className="text-xs text-slate-500 uppercase tracking-wider">
							Resource (Object)
						</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
							<input
								type="text"
								placeholder="Search resources..."
								value={resourceSearch}
								onChange={(e) => setResourceSearch(e.target.value)}
								className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
							/>
						</div>
						{resourceSearch && (
							<div className="max-h-32 overflow-y-auto space-y-1">
								{filteredResources.slice(0, 5).map((resource) => (
									<button
										key={resource.id}
										onClick={() => {
											setSelectedResource(resource);
											setResourceSearch('');
										}}
										className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
									>
										<div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
											<FileText className="w-4 h-4 text-cyan-400" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-slate-200 truncate">
												{resource.name}
											</p>
											<p className="text-xs text-slate-500">{resource.type}</p>
										</div>
									</button>
								))}
							</div>
						)}
						{selectedResource && (
							<div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
								<FileText className="w-5 h-5 text-cyan-400" />
								<div className="flex-1 min-w-0">
									<p className="text-sm text-slate-200">{selectedResource.name}</p>
									<p className="text-xs text-slate-500">{selectedResource.type}</p>
								</div>
								<button
									onClick={() => setSelectedResource(null)}
									className="text-slate-500 hover:text-slate-300"
								>
									<XCircle className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>

					{/* Action Selection */}
					<div className="space-y-2">
						<label className="text-xs text-slate-500 uppercase tracking-wider">
							Action
						</label>
						<div className="flex flex-wrap gap-2">
							{ACTIONS.map((action) => (
								<button
									key={action}
									onClick={() => setSelectedAction(action)}
									className={cn(
										'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors border',
										selectedAction === action
											? 'bg-brass-500/20 border-brass-500/50 text-brass-400'
											: 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
									)}
								>
									{action}
								</button>
							))}
						</div>
					</div>

					{/* Context (Optional) */}
					<div className="space-y-2">
						<button
							onClick={() => setShowContext(!showContext)}
							className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider hover:text-slate-400"
						>
							<ChevronRight
								className={cn(
									'w-3 h-3 transition-transform',
									showContext && 'rotate-90'
								)}
							/>
							Additional Context (Optional)
						</button>
						<AnimatePresence>
							{showContext && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: 'auto', opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									className="space-y-2 overflow-hidden"
								>
									{Object.entries(customContext).map(([key, value]) => (
										<div key={key} className="flex items-center gap-2">
											<input
												type="text"
												value={key}
												onChange={(e) => {
													const newContext = { ...customContext };
													delete newContext[key];
													newContext[e.target.value] = value;
													setCustomContext(newContext);
												}}
												placeholder="Key"
												className="w-1/3 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500"
											/>
											<input
												type="text"
												value={value}
												onChange={(e) => updateContextField(key, e.target.value)}
												placeholder="Value"
												className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500"
											/>
											<button
												onClick={() => removeContextField(key)}
												className="p-2 text-slate-500 hover:text-red-400"
											>
												<XCircle className="w-4 h-4" />
											</button>
										</div>
									))}
									<button
										onClick={addContextField}
										className="text-sm text-brass-400 hover:text-brass-300"
									>
										+ Add context attribute
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Analyze Button */}
					<button
						onClick={runAnalysis}
						disabled={!selectedUser || !selectedResource || isAnalyzing}
						className={cn(
							'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
							selectedUser && selectedResource
								? 'bg-brass-500 text-slate-900 hover:bg-brass-400'
								: 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
						)}
					>
						{isAnalyzing ? (
							<>
								<Zap className="w-5 h-5 animate-pulse" />
								Analyzing...
							</>
						) : (
							<>
								<Play className="w-5 h-5" />
								Run Analysis
							</>
						)}
					</button>
				</div>

				{/* Results */}
				<div className="p-4">
					<h3 className="text-sm font-medium text-slate-300 mb-3">Analysis Results</h3>

					{results.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-64 text-center">
							<BookOpen className="w-12 h-12 text-slate-700 mb-3" />
							<p className="text-sm text-slate-500">No analysis results yet</p>
							<p className="text-xs text-slate-600 mt-1">
								Select a user, resource, and action to test
							</p>
						</div>
					) : (
						<div className="space-y-3 max-h-[400px] overflow-y-auto">
							{results.map((result, idx) => (
								<motion.div
									key={idx}
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									className={cn(
										'p-4 rounded-lg border',
										result.decision.allowed
											? 'bg-emerald-500/5 border-emerald-500/30'
											: 'bg-red-500/5 border-red-500/30'
									)}
								>
									<div className="flex items-start gap-3">
										{result.decision.allowed ? (
											<CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
										) : (
											<XCircle className="w-5 h-5 text-red-400 mt-0.5" />
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="text-sm text-slate-200">
													{result.request.user.displayName}
												</span>
												<ChevronRight className="w-3 h-3 text-slate-600" />
												<span className={cn(
													'px-2 py-0.5 rounded text-xs capitalize',
													result.decision.allowed
														? 'bg-emerald-500/20 text-emerald-400'
														: 'bg-red-500/20 text-red-400'
												)}>
													{result.request.action}
												</span>
												<ChevronRight className="w-3 h-3 text-slate-600" />
												<span className="text-sm text-slate-400">
													{typeof result.request.resource === 'string'
														? result.request.resource
														: 'Resource'}
												</span>
											</div>
											<p className="text-xs text-slate-500 mt-2">
												{result.decision.reason}
											</p>
											{result.decision.matchedPolicies.length > 0 && (
												<div className="flex items-center gap-1 mt-2 flex-wrap">
													<Shield className="w-3 h-3 text-slate-500" />
													{result.decision.matchedPolicies.map((policy) => (
														<span
															key={policy}
															className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-400"
														>
															{policy}
														</span>
													))}
												</div>
											)}
											<div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
												<Clock className="w-3 h-3" />
												{result.timestamp.toLocaleTimeString()}
												<span className="text-slate-700">•</span>
												{result.decision.evaluationTime.toFixed(2)}ms
											</div>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
