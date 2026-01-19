// (c) Copyright Datacraft, 2026
import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
	BrainCircuit,
	Sparkles,
	Calendar,
	FileText,
	Target,
	Clock,
	Users,
	ChevronRight,
	ChevronDown,
	Check,
	X,
	Edit2,
	Trash2,
	Plus,
	RefreshCw,
	AlertTriangle,
	Save,
	ArrowRight,
	Wand2,
	Sun,
	Moon,
	Sunset,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as api from '../api';
import { scanningProjectKeys } from '../hooks';

// ============================================================================
// Types
// ============================================================================

interface GeneratedMilestone {
	id: string;
	name: string;
	description: string;
	targetDate: string;
	targetPages: number;
	percentComplete: number;
}

interface GeneratedShift {
	id: string;
	name: string;
	shiftType: 'morning' | 'afternoon' | 'night';
	startTime: string;
	endTime: string;
	daysOfWeek: string[];
	operatorsNeeded: number;
	pagesPerOperator: number;
}

interface ProjectPlanConfig {
	startDate: string;
	endDate: string;
	totalPages: number;
	workingDaysPerWeek: number;
	shiftsPerDay: number;
	pagesPerOperatorHour: number;
	hoursPerShift: number;
}

interface AIProjectPlannerProps {
	projectId: string;
	projectName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialConfig?: Partial<ProjectPlanConfig>;
}

// ============================================================================
// Plan Generation Logic
// ============================================================================

function generateMilestones(config: ProjectPlanConfig): GeneratedMilestone[] {
	const start = new Date(config.startDate);
	const end = new Date(config.endDate);
	const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
	const totalWeeks = Math.ceil(totalDays / 7);

	// Generate milestones at 25%, 50%, 75%, 100% or more granular for longer projects
	const milestoneCount = totalWeeks <= 4 ? 4 : totalWeeks <= 8 ? 5 : totalWeeks <= 12 ? 6 : 8;
	const milestones: GeneratedMilestone[] = [];

	const milestoneNames = [
		{ name: 'Project Kickoff', desc: 'Initial setup, team orientation, and first batch processing' },
		{ name: 'Early Progress', desc: 'Stabilize scanning workflow and establish daily rhythm' },
		{ name: 'Quarter Complete', desc: '25% of estimated pages scanned and quality verified' },
		{ name: 'Midpoint Review', desc: '50% completion with full QC review' },
		{ name: 'Three-Quarter Mark', desc: '75% completion, final push preparation' },
		{ name: 'Pre-Completion Check', desc: 'Final quality audit before completion' },
		{ name: 'Final Delivery', desc: '100% scanning complete, all pages verified' },
		{ name: 'Project Closure', desc: 'Final handoff and documentation' },
	];

	for (let i = 0; i < milestoneCount; i++) {
		const progressPercent = ((i + 1) / milestoneCount) * 100;
		const daysFromStart = Math.round((totalDays * (i + 1)) / milestoneCount);
		const targetDate = new Date(start);
		targetDate.setDate(targetDate.getDate() + daysFromStart);

		const targetPages = Math.round((config.totalPages * (i + 1)) / milestoneCount);
		const nameInfo = milestoneNames[Math.min(i, milestoneNames.length - 1)];

		milestones.push({
			id: `gen-ms-${i + 1}`,
			name: nameInfo.name,
			description: nameInfo.desc,
			targetDate: targetDate.toISOString().split('T')[0],
			targetPages,
			percentComplete: Math.round(progressPercent),
		});
	}

	return milestones;
}

function generateShifts(config: ProjectPlanConfig): GeneratedShift[] {
	const shifts: GeneratedShift[] = [];
	const shiftTemplates = [
		{ name: 'Morning Shift', type: 'morning' as const, start: '08:00', end: '16:00', icon: Sun },
		{ name: 'Afternoon Shift', type: 'afternoon' as const, start: '14:00', end: '22:00', icon: Sunset },
		{ name: 'Night Shift', type: 'night' as const, start: '22:00', end: '06:00', icon: Moon },
	];

	// Calculate required capacity
	const start = new Date(config.startDate);
	const end = new Date(config.endDate);
	const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
	const workingDays = Math.round(totalDays * (config.workingDaysPerWeek / 7));
	const pagesPerDay = Math.ceil(config.totalPages / workingDays);
	const pagesPerShift = Math.ceil(pagesPerDay / config.shiftsPerDay);
	const pagesPerOperatorPerShift = config.pagesPerOperatorHour * config.hoursPerShift;
	const operatorsPerShift = Math.ceil(pagesPerShift / pagesPerOperatorPerShift);

	// Generate shifts based on config
	const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	if (config.workingDaysPerWeek >= 6) workDays.push('Saturday');
	if (config.workingDaysPerWeek >= 7) workDays.push('Sunday');

	for (let i = 0; i < config.shiftsPerDay; i++) {
		const template = shiftTemplates[i % shiftTemplates.length];
		shifts.push({
			id: `gen-shift-${i + 1}`,
			name: template.name,
			shiftType: template.type,
			startTime: template.start,
			endTime: template.end,
			daysOfWeek: workDays,
			operatorsNeeded: operatorsPerShift,
			pagesPerOperator: pagesPerOperatorPerShift,
		});
	}

	return shifts;
}

// ============================================================================
// Sub-Components
// ============================================================================

function ConfigForm({
	config,
	onChange,
	onGenerate,
	isGenerating,
}: {
	config: ProjectPlanConfig;
	onChange: (config: ProjectPlanConfig) => void;
	onGenerate: () => void;
	isGenerating: boolean;
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label>
					<input
						type="date"
						value={config.startDate}
						onChange={(e) => onChange({ ...config, startDate: e.target.value })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1.5">End Date</label>
					<input
						type="date"
						value={config.endDate}
						onChange={(e) => onChange({ ...config, endDate: e.target.value })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					/>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-slate-300 mb-1.5">Total Estimated Pages</label>
				<input
					type="number"
					value={config.totalPages}
					onChange={(e) => onChange({ ...config, totalPages: parseInt(e.target.value) || 0 })}
					min={1}
					className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					placeholder="e.g., 100000"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1.5">Working Days/Week</label>
					<select
						value={config.workingDaysPerWeek}
						onChange={(e) => onChange({ ...config, workingDaysPerWeek: parseInt(e.target.value) })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					>
						<option value={5}>5 days (Mon-Fri)</option>
						<option value={6}>6 days (Mon-Sat)</option>
						<option value={7}>7 days (All week)</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1.5">Shifts Per Day</label>
					<select
						value={config.shiftsPerDay}
						onChange={(e) => onChange({ ...config, shiftsPerDay: parseInt(e.target.value) })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					>
						<option value={1}>1 shift</option>
						<option value={2}>2 shifts</option>
						<option value={3}>3 shifts</option>
					</select>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1.5">Pages/Operator/Hour</label>
					<input
						type="number"
						value={config.pagesPerOperatorHour}
						onChange={(e) => onChange({ ...config, pagesPerOperatorHour: parseInt(e.target.value) || 50 })}
						min={10}
						max={500}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1.5">Hours Per Shift</label>
					<input
						type="number"
						value={config.hoursPerShift}
						onChange={(e) => onChange({ ...config, hoursPerShift: parseInt(e.target.value) || 8 })}
						min={4}
						max={12}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
					/>
				</div>
			</div>

			<button
				onClick={onGenerate}
				disabled={isGenerating || !config.startDate || !config.endDate || !config.totalPages}
				className={cn(
					'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all',
					'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400',
					'border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10',
					(isGenerating || !config.startDate || !config.endDate || !config.totalPages) && 'opacity-50 cursor-not-allowed'
				)}
			>
				{isGenerating ? (
					<RefreshCw className="w-5 h-5 animate-spin" />
				) : (
					<Wand2 className="w-5 h-5" />
				)}
				{isGenerating ? 'Generating Plan...' : 'Generate Project Plan'}
			</button>
		</div>
	);
}

function MilestoneEditor({
	milestones,
	onUpdate,
	onDelete,
	onAdd,
}: {
	milestones: GeneratedMilestone[];
	onUpdate: (id: string, updates: Partial<GeneratedMilestone>) => void;
	onDelete: (id: string) => void;
	onAdd: () => void;
}) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
					<Target className="w-4 h-4 text-cyan-400" />
					Milestones ({milestones.length})
				</h4>
				<button
					onClick={onAdd}
					className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
				>
					<Plus className="w-3.5 h-3.5" />
					Add
				</button>
			</div>

			<div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
				{milestones.map((ms, idx) => (
					<motion.div
						key={ms.id}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ delay: idx * 0.05 }}
						className={cn(
							'bg-slate-800/50 border rounded-lg overflow-hidden transition-colors',
							expandedId === ms.id ? 'border-cyan-500/30' : 'border-slate-700/50'
						)}
					>
						<button
							onClick={() => setExpandedId(expandedId === ms.id ? null : ms.id)}
							className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/70 transition-colors"
						>
							<div className={cn(
								'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
								ms.percentComplete <= 25 ? 'bg-blue-500/20 text-blue-400' :
								ms.percentComplete <= 50 ? 'bg-cyan-500/20 text-cyan-400' :
								ms.percentComplete <= 75 ? 'bg-amber-500/20 text-amber-400' :
								'bg-emerald-500/20 text-emerald-400'
							)}>
								{ms.percentComplete}%
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-slate-200 truncate">{ms.name}</p>
								<p className="text-xs text-slate-500">
									{new Date(ms.targetDate).toLocaleDateString()} · {ms.targetPages.toLocaleString()} pages
								</p>
							</div>
							{expandedId === ms.id ? (
								<ChevronDown className="w-4 h-4 text-slate-500" />
							) : (
								<ChevronRight className="w-4 h-4 text-slate-500" />
							)}
						</button>

						<AnimatePresence>
							{expandedId === ms.id && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: 'auto', opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									className="border-t border-slate-700/50"
								>
									<div className="p-3 space-y-3">
										{editingId === ms.id ? (
											<>
												<input
													type="text"
													value={ms.name}
													onChange={(e) => onUpdate(ms.id, { name: e.target.value })}
													className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
													placeholder="Milestone name"
												/>
												<textarea
													value={ms.description}
													onChange={(e) => onUpdate(ms.id, { description: e.target.value })}
													className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
													rows={2}
													placeholder="Description"
												/>
												<div className="grid grid-cols-2 gap-2">
													<input
														type="date"
														value={ms.targetDate}
														onChange={(e) => onUpdate(ms.id, { targetDate: e.target.value })}
														className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
													/>
													<input
														type="number"
														value={ms.targetPages}
														onChange={(e) => onUpdate(ms.id, { targetPages: parseInt(e.target.value) || 0 })}
														className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
														placeholder="Target pages"
													/>
												</div>
											</>
										) : (
											<p className="text-sm text-slate-400">{ms.description}</p>
										)}

										<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
											<button
												onClick={() => setEditingId(editingId === ms.id ? null : ms.id)}
												className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
											>
												<Edit2 className="w-3.5 h-3.5" />
												{editingId === ms.id ? 'Done' : 'Edit'}
											</button>
											<button
												onClick={() => onDelete(ms.id)}
												className="flex items-center gap-1 px-2 py-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
											>
												<Trash2 className="w-3.5 h-3.5" />
												Delete
											</button>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				))}
			</div>
		</div>
	);
}

function ShiftEditor({
	shifts,
	onUpdate,
	onDelete,
	onAdd,
}: {
	shifts: GeneratedShift[];
	onUpdate: (id: string, updates: Partial<GeneratedShift>) => void;
	onDelete: (id: string) => void;
	onAdd: () => void;
}) {
	const [editingId, setEditingId] = useState<string | null>(null);

	const shiftIcons = {
		morning: Sun,
		afternoon: Sunset,
		night: Moon,
	};

	const shiftColors = {
		morning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
		afternoon: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
		night: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between mb-3">
				<h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
					<Clock className="w-4 h-4 text-purple-400" />
					Shift Schedule ({shifts.length})
				</h4>
				<button
					onClick={onAdd}
					className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
				>
					<Plus className="w-3.5 h-3.5" />
					Add
				</button>
			</div>

			<div className="space-y-2">
				{shifts.map((shift, idx) => {
					const Icon = shiftIcons[shift.shiftType];
					const colors = shiftColors[shift.shiftType];

					return (
						<motion.div
							key={shift.id}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: idx * 0.05 }}
							className={cn('border rounded-lg p-3', colors)}
						>
							{editingId === shift.id ? (
								<div className="space-y-2">
									<input
										type="text"
										value={shift.name}
										onChange={(e) => onUpdate(shift.id, { name: e.target.value })}
										className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
									/>
									<div className="grid grid-cols-3 gap-2">
										<select
											value={shift.shiftType}
											onChange={(e) => onUpdate(shift.id, { shiftType: e.target.value as 'morning' | 'afternoon' | 'night' })}
											className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
										>
											<option value="morning">Morning</option>
											<option value="afternoon">Afternoon</option>
											<option value="night">Night</option>
										</select>
										<input
											type="time"
											value={shift.startTime}
											onChange={(e) => onUpdate(shift.id, { startTime: e.target.value })}
											className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
										/>
										<input
											type="time"
											value={shift.endTime}
											onChange={(e) => onUpdate(shift.id, { endTime: e.target.value })}
											className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
										/>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="text-xs text-slate-500 block mb-1">Operators Needed</label>
											<input
												type="number"
												value={shift.operatorsNeeded}
												onChange={(e) => onUpdate(shift.id, { operatorsNeeded: parseInt(e.target.value) || 1 })}
												min={1}
												className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
											/>
										</div>
										<div>
											<label className="text-xs text-slate-500 block mb-1">Pages/Operator</label>
											<input
												type="number"
												value={shift.pagesPerOperator}
												onChange={(e) => onUpdate(shift.id, { pagesPerOperator: parseInt(e.target.value) || 100 })}
												min={10}
												className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
											/>
										</div>
									</div>
									<div className="flex justify-end gap-2">
										<button
											onClick={() => setEditingId(null)}
											className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
										>
											Done
										</button>
									</div>
								</div>
							) : (
								<div className="flex items-center gap-3">
									<div className="p-2 bg-slate-900/50 rounded-lg">
										<Icon className="w-5 h-5" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium">{shift.name}</p>
										<p className="text-xs opacity-70">
											{shift.startTime} - {shift.endTime} · {shift.daysOfWeek.slice(0, 3).join(', ')}
											{shift.daysOfWeek.length > 3 && '...'}
										</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-medium">{shift.operatorsNeeded}</p>
										<p className="text-xs opacity-70">operators</p>
									</div>
									<div className="flex items-center gap-1">
										<button
											onClick={() => setEditingId(shift.id)}
											className="p-1.5 hover:bg-slate-900/30 rounded transition-colors"
										>
											<Edit2 className="w-3.5 h-3.5" />
										</button>
										<button
											onClick={() => onDelete(shift.id)}
											className="p-1.5 hover:bg-rose-500/20 rounded transition-colors text-rose-400"
										>
											<Trash2 className="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							)}
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}

function PlanSummary({ config, milestones, shifts }: { config: ProjectPlanConfig; milestones: GeneratedMilestone[]; shifts: GeneratedShift[] }) {
	const totalOperators = shifts.reduce((sum, s) => sum + s.operatorsNeeded, 0);
	const dailyCapacity = shifts.reduce((sum, s) => sum + (s.operatorsNeeded * s.pagesPerOperator), 0);

	const start = new Date(config.startDate);
	const end = new Date(config.endDate);
	const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

	return (
		<div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg p-4">
			<h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
				<Sparkles className="w-4 h-4 text-cyan-400" />
				Plan Summary
			</h4>
			<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-slate-500">Duration</span>
					<span className="text-slate-200 font-medium">{totalDays} days</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Total Pages</span>
					<span className="text-slate-200 font-medium">{config.totalPages.toLocaleString()}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Milestones</span>
					<span className="text-cyan-400 font-medium">{milestones.length}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Shifts</span>
					<span className="text-purple-400 font-medium">{shifts.length}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Total Operators</span>
					<span className="text-slate-200 font-medium">{totalOperators}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-slate-500">Daily Capacity</span>
					<span className="text-emerald-400 font-medium">{dailyCapacity.toLocaleString()} pages</span>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function AIProjectPlanner({
	projectId,
	projectName,
	open,
	onOpenChange,
	initialConfig,
}: AIProjectPlannerProps) {
	const queryClient = useQueryClient();

	// Default config
	const today = new Date();
	const threeMonthsLater = new Date(today);
	threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

	const [config, setConfig] = useState<ProjectPlanConfig>({
		startDate: initialConfig?.startDate || today.toISOString().split('T')[0],
		endDate: initialConfig?.endDate || threeMonthsLater.toISOString().split('T')[0],
		totalPages: initialConfig?.totalPages || 100000,
		workingDaysPerWeek: initialConfig?.workingDaysPerWeek || 5,
		shiftsPerDay: initialConfig?.shiftsPerDay || 1,
		pagesPerOperatorHour: initialConfig?.pagesPerOperatorHour || 60,
		hoursPerShift: initialConfig?.hoursPerShift || 8,
	});

	const [step, setStep] = useState<'config' | 'review'>('config');
	const [milestones, setMilestones] = useState<GeneratedMilestone[]>([]);
	const [shifts, setShifts] = useState<GeneratedShift[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);

	// Create milestones mutation
	const createMilestones = useMutation({
		mutationFn: async (ms: GeneratedMilestone[]) => {
			const results = [];
			for (const m of ms) {
				const result = await api.createMilestone(projectId, {
					name: m.name,
					description: m.description,
					targetDate: m.targetDate,
					targetPages: m.targetPages,
				});
				results.push(result);
			}
			return results;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scanningProjectKeys.milestones(projectId) });
		},
	});

	// Generate plan
	const handleGenerate = useCallback(() => {
		setIsGenerating(true);
		// Simulate AI processing delay
		setTimeout(() => {
			const generatedMilestones = generateMilestones(config);
			const generatedShifts = generateShifts(config);
			setMilestones(generatedMilestones);
			setShifts(generatedShifts);
			setStep('review');
			setIsGenerating(false);
		}, 800);
	}, [config]);

	// Update milestone
	const handleUpdateMilestone = useCallback((id: string, updates: Partial<GeneratedMilestone>) => {
		setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
	}, []);

	// Delete milestone
	const handleDeleteMilestone = useCallback((id: string) => {
		setMilestones(prev => prev.filter(m => m.id !== id));
	}, []);

	// Add milestone
	const handleAddMilestone = useCallback(() => {
		const lastMilestone = milestones[milestones.length - 1];
		const newDate = lastMilestone
			? new Date(new Date(lastMilestone.targetDate).getTime() + 7 * 24 * 60 * 60 * 1000)
			: new Date(config.endDate);

		setMilestones(prev => [...prev, {
			id: `gen-ms-new-${Date.now()}`,
			name: 'New Milestone',
			description: 'Describe this milestone',
			targetDate: newDate.toISOString().split('T')[0],
			targetPages: lastMilestone ? lastMilestone.targetPages + 10000 : config.totalPages,
			percentComplete: 100,
		}]);
	}, [milestones, config]);

	// Update shift
	const handleUpdateShift = useCallback((id: string, updates: Partial<GeneratedShift>) => {
		setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
	}, []);

	// Delete shift
	const handleDeleteShift = useCallback((id: string) => {
		setShifts(prev => prev.filter(s => s.id !== id));
	}, []);

	// Add shift
	const handleAddShift = useCallback(() => {
		setShifts(prev => [...prev, {
			id: `gen-shift-new-${Date.now()}`,
			name: 'New Shift',
			shiftType: 'morning',
			startTime: '09:00',
			endTime: '17:00',
			daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
			operatorsNeeded: 2,
			pagesPerOperator: 400,
		}]);
	}, []);

	// Save plan
	const handleSave = useCallback(async () => {
		await createMilestones.mutateAsync(milestones);
		// TODO: Save shifts via API when endpoint is available
		onOpenChange(false);
	}, [milestones, createMilestones, onOpenChange]);

	// Validation
	const isValidConfig = useMemo(() => {
		return config.startDate && config.endDate && config.totalPages > 0 &&
			new Date(config.startDate) < new Date(config.endDate);
	}, [config]);

	const hasWarning = useMemo(() => {
		if (!isValidConfig) return null;
		const start = new Date(config.startDate);
		const end = new Date(config.endDate);
		const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		const dailyTarget = config.totalPages / days;
		const dailyCapacity = config.shiftsPerDay * config.pagesPerOperatorHour * config.hoursPerShift * 10; // Assume max 10 operators per shift

		if (dailyTarget > dailyCapacity) {
			return `Daily target (${Math.round(dailyTarget).toLocaleString()} pages) may exceed capacity. Consider extending timeline or adding shifts.`;
		}
		return null;
	}, [config, isValidConfig]);

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-slate-800">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg">
								<BrainCircuit className="w-5 h-5 text-cyan-400" />
							</div>
							<div>
								<Dialog.Title className="text-lg font-semibold text-slate-100">
									AI Project Planner
								</Dialog.Title>
								<Dialog.Description className="text-sm text-slate-500">
									{projectName}
								</Dialog.Description>
							</div>
						</div>
						<Dialog.Close className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
							<X className="w-5 h-5" />
						</Dialog.Close>
					</div>

					{/* Progress Steps */}
					<div className="flex items-center gap-2 px-4 py-3 bg-slate-800/30 border-b border-slate-800">
						<button
							onClick={() => setStep('config')}
							className={cn(
								'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
								step === 'config' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-slate-300'
							)}
						>
							<span className={cn(
								'w-5 h-5 rounded-full flex items-center justify-center text-xs',
								step === 'config' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-400'
							)}>1</span>
							Configure
						</button>
						<ArrowRight className="w-4 h-4 text-slate-600" />
						<button
							onClick={() => milestones.length > 0 && setStep('review')}
							disabled={milestones.length === 0}
							className={cn(
								'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
								step === 'review' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400',
								milestones.length === 0 && 'opacity-50 cursor-not-allowed'
							)}
						>
							<span className={cn(
								'w-5 h-5 rounded-full flex items-center justify-center text-xs',
								step === 'review' ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-slate-400'
							)}>2</span>
							Review & Edit
						</button>
					</div>

					{/* Content */}
					<div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
						{step === 'config' && (
							<div className="space-y-4">
								<ConfigForm
									config={config}
									onChange={setConfig}
									onGenerate={handleGenerate}
									isGenerating={isGenerating}
								/>

								{hasWarning && (
									<div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
										<AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
										{hasWarning}
									</div>
								)}
							</div>
						)}

						{step === 'review' && (
							<div className="space-y-6">
								<PlanSummary config={config} milestones={milestones} shifts={shifts} />

								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
									<MilestoneEditor
										milestones={milestones}
										onUpdate={handleUpdateMilestone}
										onDelete={handleDeleteMilestone}
										onAdd={handleAddMilestone}
									/>
									<ShiftEditor
										shifts={shifts}
										onUpdate={handleUpdateShift}
										onDelete={handleDeleteShift}
										onAdd={handleAddShift}
									/>
								</div>
							</div>
						)}
					</div>

					{/* Footer */}
					{step === 'review' && (
						<div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-800/30">
							<button
								onClick={() => setStep('config')}
								className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
							>
								<RefreshCw className="w-4 h-4" />
								Regenerate
							</button>
							<div className="flex items-center gap-3">
								<Dialog.Close className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors">
									Cancel
								</Dialog.Close>
								<button
									onClick={handleSave}
									disabled={createMilestones.isPending || milestones.length === 0}
									className={cn(
										'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
										'bg-cyan-500 text-slate-900 hover:bg-cyan-400',
										(createMilestones.isPending || milestones.length === 0) && 'opacity-50 cursor-not-allowed'
									)}
								>
									{createMilestones.isPending ? (
										<RefreshCw className="w-4 h-4 animate-spin" />
									) : (
										<Save className="w-4 h-4" />
									)}
									{createMilestones.isPending ? 'Saving...' : 'Apply Plan'}
								</button>
							</div>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
