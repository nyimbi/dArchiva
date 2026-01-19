// (c) Copyright Datacraft, 2026
import { useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { MetricCard } from '../core/MetricCard';
import {
	CalendarIcon,
	ClockIcon,
	UsersIcon,
	PlusIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	AlertTriangleIcon,
	CheckCircleIcon,
	XIcon,
	SunIcon,
	SunsetIcon,
	MoonIcon,
	CopyIcon,
	Trash2Icon,
	EditIcon,
} from 'lucide-react';

// Types
interface Operator {
	id: string;
	name: string;
	avatar?: string;
	skills: string[];
	maxHoursPerWeek: number;
}

interface Shift {
	id: string;
	date: string;
	startTime: string;
	endTime: string;
	template: ShiftTemplate;
	operatorIds: string[];
	requiredOperators: number;
	notes?: string;
	status: 'draft' | 'published' | 'in_progress' | 'completed';
}

type ShiftTemplate = 'morning' | 'afternoon' | 'night' | 'custom';

interface ShiftPlannerTabProps {
	projectId: string;
}

// Shift template configurations
const SHIFT_TEMPLATES: Record<ShiftTemplate, { label: string; startTime: string; endTime: string; icon: typeof SunIcon; color: string }> = {
	morning: { label: 'Morning', startTime: '06:00', endTime: '14:00', icon: SunIcon, color: 'amber' },
	afternoon: { label: 'Afternoon', startTime: '14:00', endTime: '22:00', icon: SunsetIcon, color: 'orange' },
	night: { label: 'Night', startTime: '22:00', endTime: '06:00', icon: MoonIcon, color: 'indigo' },
	custom: { label: 'Custom', startTime: '09:00', endTime: '17:00', icon: ClockIcon, color: 'slate' },
};

// Mock data - replace with actual API hooks
const MOCK_OPERATORS: Operator[] = [
	{ id: 'op-1', name: 'Alice Chen', skills: ['scanning', 'qa'], maxHoursPerWeek: 40 },
	{ id: 'op-2', name: 'Bob Martinez', skills: ['scanning', 'indexing'], maxHoursPerWeek: 40 },
	{ id: 'op-3', name: 'Carol Singh', skills: ['scanning', 'qa', 'indexing'], maxHoursPerWeek: 32 },
	{ id: 'op-4', name: 'David Kim', skills: ['scanning'], maxHoursPerWeek: 40 },
	{ id: 'op-5', name: 'Eva Thompson', skills: ['scanning', 'qa'], maxHoursPerWeek: 24 },
];

const MOCK_SHIFTS: Shift[] = [
	{ id: 'sh-1', date: '2026-01-19', startTime: '06:00', endTime: '14:00', template: 'morning', operatorIds: ['op-1', 'op-2'], requiredOperators: 3, status: 'published' },
	{ id: 'sh-2', date: '2026-01-19', startTime: '14:00', endTime: '22:00', template: 'afternoon', operatorIds: ['op-3'], requiredOperators: 2, status: 'published' },
	{ id: 'sh-3', date: '2026-01-20', startTime: '06:00', endTime: '14:00', template: 'morning', operatorIds: ['op-4', 'op-5', 'op-1'], requiredOperators: 3, status: 'draft' },
	{ id: 'sh-4', date: '2026-01-21', startTime: '14:00', endTime: '22:00', template: 'afternoon', operatorIds: ['op-2', 'op-3'], requiredOperators: 2, status: 'draft' },
	{ id: 'sh-5', date: '2026-01-22', startTime: '22:00', endTime: '06:00', template: 'night', operatorIds: [], requiredOperators: 2, status: 'draft' },
];

// Utility functions
function getWeekDates(date: Date): Date[] {
	const start = new Date(date);
	const day = start.getDay();
	const diff = start.getDate() - day + (day === 0 ? -6 : 1);
	start.setDate(diff);

	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		return d;
	});
}

function formatDateKey(date: Date): string {
	return date.toISOString().split('T')[0];
}

function formatTime(time: string): string {
	const [hours, minutes] = time.split(':');
	const h = parseInt(hours);
	const ampm = h >= 12 ? 'PM' : 'AM';
	const h12 = h % 12 || 12;
	return `${h12}:${minutes} ${ampm}`;
}

function getShiftDuration(startTime: string, endTime: string): number {
	const [sh, sm] = startTime.split(':').map(Number);
	const [eh, em] = endTime.split(':').map(Number);
	let duration = (eh * 60 + em) - (sh * 60 + sm);
	if (duration < 0) duration += 24 * 60; // overnight shift
	return duration / 60;
}

export function ShiftPlannerTab({ projectId }: ShiftPlannerTabProps) {
	const [currentWeekStart, setCurrentWeekStart] = useState(() => {
		const now = new Date();
		const day = now.getDay();
		const diff = now.getDate() - day + (day === 0 ? -6 : 1);
		return new Date(now.setDate(diff));
	});
	const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
	const [operators] = useState<Operator[]>(MOCK_OPERATORS);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingShift, setEditingShift] = useState<Shift | null>(null);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

	// Metrics calculations
	const metrics = useMemo(() => {
		const weekShifts = shifts.filter(s =>
			weekDates.some(d => formatDateKey(d) === s.date)
		);
		const totalHours = weekShifts.reduce((sum, s) =>
			sum + getShiftDuration(s.startTime, s.endTime) * s.operatorIds.length, 0
		);
		const understaffed = weekShifts.filter(s => s.operatorIds.length < s.requiredOperators);
		const unassigned = weekShifts.filter(s => s.operatorIds.length === 0);
		const fullyStaffed = weekShifts.filter(s => s.operatorIds.length >= s.requiredOperators);

		return { totalHours, understaffed: understaffed.length, unassigned: unassigned.length, fullyStaffed: fullyStaffed.length, totalShifts: weekShifts.length };
	}, [shifts, weekDates]);

	// Navigation
	const navigateWeek = (direction: 'prev' | 'next') => {
		setCurrentWeekStart(prev => {
			const newDate = new Date(prev);
			newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
			return newDate;
		});
	};

	const goToToday = () => {
		const now = new Date();
		const day = now.getDay();
		const diff = now.getDate() - day + (day === 0 ? -6 : 1);
		setCurrentWeekStart(new Date(now.setDate(diff)));
	};

	// Shift operations
	const openCreateDialog = (date?: string) => {
		setSelectedDate(date || null);
		setEditingShift(null);
		setDialogOpen(true);
	};

	const openEditDialog = (shift: Shift) => {
		setEditingShift(shift);
		setSelectedDate(shift.date);
		setDialogOpen(true);
	};

	const handleSaveShift = (shiftData: Omit<Shift, 'id'>) => {
		if (editingShift) {
			setShifts(prev => prev.map(s => s.id === editingShift.id ? { ...shiftData, id: editingShift.id } : s));
		} else {
			const newShift: Shift = { ...shiftData, id: `sh-${Date.now()}` };
			setShifts(prev => [...prev, newShift]);
		}
		setDialogOpen(false);
		setEditingShift(null);
	};

	const handleDeleteShift = (shiftId: string) => {
		setShifts(prev => prev.filter(s => s.id !== shiftId));
	};

	const handleDuplicateShift = (shift: Shift, targetDate: string) => {
		const newShift: Shift = {
			...shift,
			id: `sh-${Date.now()}`,
			date: targetDate,
			status: 'draft',
		};
		setShifts(prev => [...prev, newShift]);
	};

	// Get shifts for a specific date
	const getShiftsForDate = (date: Date): Shift[] => {
		const dateKey = formatDateKey(date);
		return shifts.filter(s => s.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
	};

	// Get operator by ID
	const getOperator = (id: string): Operator | undefined => operators.find(o => o.id === id);

	return (
		<div className="space-y-6">
			{/* Metrics */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<MetricCard
					label="Total Shifts"
					value={metrics.totalShifts}
					icon={<CalendarIcon className="w-4 h-4" />}
					accent="cyan"
				/>
				<MetricCard
					label="Scheduled Hours"
					value={`${metrics.totalHours.toFixed(0)}h`}
					icon={<ClockIcon className="w-4 h-4" />}
					accent="emerald"
				/>
				<MetricCard
					label="Fully Staffed"
					value={metrics.fullyStaffed}
					sublabel={`of ${metrics.totalShifts} shifts`}
					icon={<CheckCircleIcon className="w-4 h-4" />}
					accent="emerald"
				/>
				<MetricCard
					label="Understaffed"
					value={metrics.understaffed}
					icon={<AlertTriangleIcon className="w-4 h-4" />}
					accent={metrics.understaffed > 0 ? 'amber' : 'default'}
					pulse={metrics.understaffed > 0}
				/>
			</div>

			{/* Coverage Warning */}
			{metrics.understaffed > 0 && (
				<div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
					<AlertTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
					<div>
						<p className="text-sm font-medium text-amber-400">Coverage Gaps Detected</p>
						<p className="text-xs text-amber-400/70">
							{metrics.understaffed} shift{metrics.understaffed !== 1 ? 's' : ''} need{metrics.understaffed === 1 ? 's' : ''} additional operators assigned
						</p>
					</div>
				</div>
			)}

			{/* Calendar Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<h2 className="text-lg font-semibold text-slate-100">Weekly Schedule</h2>
					<div className="flex items-center gap-1">
						<button
							onClick={() => navigateWeek('prev')}
							className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
						>
							<ChevronLeftIcon className="w-5 h-5" />
						</button>
						<button
							onClick={goToToday}
							className="px-3 py-1 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
						>
							Today
						</button>
						<button
							onClick={() => navigateWeek('next')}
							className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
						>
							<ChevronRightIcon className="w-5 h-5" />
						</button>
					</div>
					<span className="text-sm text-slate-400 font-mono">
						{weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
					</span>
				</div>
				<button
					onClick={() => openCreateDialog()}
					className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors"
				>
					<PlusIcon className="w-4 h-4" />
					Add Shift
				</button>
			</div>

			{/* Calendar Grid */}
			<div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
				{/* Day Headers */}
				<div className="grid grid-cols-7 border-b border-slate-800">
					{weekDates.map((date, idx) => {
						const isToday = formatDateKey(date) === formatDateKey(new Date());
						const dayShifts = getShiftsForDate(date);
						const hasGaps = dayShifts.some(s => s.operatorIds.length < s.requiredOperators);

						return (
							<div
								key={idx}
								className={cn(
									'p-3 text-center border-r border-slate-800 last:border-r-0',
									isToday && 'bg-cyan-500/5'
								)}
							>
								<div className="text-xs text-slate-500 uppercase tracking-wider">
									{date.toLocaleDateString('en-US', { weekday: 'short' })}
								</div>
								<div className={cn(
									'text-lg font-semibold mt-1',
									isToday ? 'text-cyan-400' : 'text-slate-100'
								)}>
									{date.getDate()}
								</div>
								{dayShifts.length > 0 && (
									<div className="flex items-center justify-center gap-1 mt-1">
										<span className="text-xs text-slate-400">{dayShifts.length} shifts</span>
										{hasGaps && <AlertTriangleIcon className="w-3 h-3 text-amber-400" />}
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Time Slots */}
				<div className="grid grid-cols-7 min-h-[400px]">
					{weekDates.map((date, dayIdx) => {
						const dateKey = formatDateKey(date);
						const dayShifts = getShiftsForDate(date);
						const isToday = dateKey === formatDateKey(new Date());

						return (
							<div
								key={dayIdx}
								className={cn(
									'border-r border-slate-800 last:border-r-0 p-2 space-y-2',
									isToday && 'bg-cyan-500/5'
								)}
							>
								{dayShifts.map(shift => (
									<ShiftCard
										key={shift.id}
										shift={shift}
										operators={shift.operatorIds.map(id => getOperator(id)).filter(Boolean) as Operator[]}
										onEdit={() => openEditDialog(shift)}
										onDelete={() => handleDeleteShift(shift.id)}
										onDuplicate={(targetDate) => handleDuplicateShift(shift, targetDate)}
										weekDates={weekDates}
									/>
								))}

								{/* Add Shift Button */}
								<button
									onClick={() => openCreateDialog(dateKey)}
									className="w-full p-2 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors flex items-center justify-center gap-1 text-xs"
								>
									<PlusIcon className="w-3 h-3" />
									Add
								</button>
							</div>
						);
					})}
				</div>
			</div>

			{/* Operator Availability Legend */}
			<div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
				<h3 className="text-sm font-medium text-slate-100 mb-3">Available Operators</h3>
				<div className="flex flex-wrap gap-2">
					{operators.map(op => {
						const weekHours = shifts
							.filter(s => weekDates.some(d => formatDateKey(d) === s.date) && s.operatorIds.includes(op.id))
							.reduce((sum, s) => sum + getShiftDuration(s.startTime, s.endTime), 0);
						const utilizationPct = (weekHours / op.maxHoursPerWeek) * 100;

						return (
							<div
								key={op.id}
								className={cn(
									'flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border rounded-full text-sm',
									utilizationPct >= 100 ? 'border-red-500/50 text-red-400' :
									utilizationPct >= 80 ? 'border-amber-500/50 text-amber-400' :
									'border-slate-700 text-slate-300'
								)}
							>
								<div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
									{op.name.charAt(0)}
								</div>
								<span>{op.name}</span>
								<span className="text-xs text-slate-500 font-mono">
									{weekHours.toFixed(0)}h/{op.maxHoursPerWeek}h
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Shift Dialog */}
			<ShiftDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				shift={editingShift}
				selectedDate={selectedDate}
				operators={operators}
				onSave={handleSaveShift}
			/>
		</div>
	);
}

// Shift Card Component
interface ShiftCardProps {
	shift: Shift;
	operators: Operator[];
	onEdit: () => void;
	onDelete: () => void;
	onDuplicate: (targetDate: string) => void;
	weekDates: Date[];
}

function ShiftCard({ shift, operators, onEdit, onDelete, onDuplicate, weekDates }: ShiftCardProps) {
	const [showActions, setShowActions] = useState(false);
	const template = SHIFT_TEMPLATES[shift.template];
	const Icon = template.icon;
	const isUnderstaffed = operators.length < shift.requiredOperators;
	const duration = getShiftDuration(shift.startTime, shift.endTime);

	const statusColors = {
		draft: 'bg-slate-500/20 text-slate-400',
		published: 'bg-cyan-500/20 text-cyan-400',
		in_progress: 'bg-emerald-500/20 text-emerald-400',
		completed: 'bg-slate-500/20 text-slate-500',
	};

	return (
		<div
			className={cn(
				'relative p-3 rounded-lg border transition-all cursor-pointer group',
				'bg-slate-800/50 hover:bg-slate-800/80',
				isUnderstaffed ? 'border-amber-500/50' : 'border-slate-700',
				shift.status === 'completed' && 'opacity-60'
			)}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
			onClick={onEdit}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<Icon className={cn('w-4 h-4', `text-${template.color}-400`)} />
					<span className="text-xs font-medium text-slate-300">{template.label}</span>
				</div>
				<span className={cn('text-[10px] px-1.5 py-0.5 rounded', statusColors[shift.status])}>
					{shift.status.replace('_', ' ')}
				</span>
			</div>

			{/* Time */}
			<div className="text-xs text-slate-400 font-mono mb-2">
				{formatTime(shift.startTime)} - {formatTime(shift.endTime)}
				<span className="text-slate-500 ml-1">({duration}h)</span>
			</div>

			{/* Operators */}
			<div className="space-y-1">
				{operators.length > 0 ? (
					<div className="flex flex-wrap gap-1">
						{operators.map(op => (
							<div
								key={op.id}
								className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-300"
								title={op.name}
							>
								<div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[8px]">
									{op.name.charAt(0)}
								</div>
								<span className="truncate max-w-[60px]">{op.name.split(' ')[0]}</span>
							</div>
						))}
					</div>
				) : (
					<div className="text-[10px] text-slate-500 italic">No operators assigned</div>
				)}
			</div>

			{/* Coverage indicator */}
			<div className="flex items-center gap-1 mt-2 text-[10px]">
				<UsersIcon className="w-3 h-3" />
				<span className={cn(
					isUnderstaffed ? 'text-amber-400' : 'text-slate-400'
				)}>
					{operators.length}/{shift.requiredOperators} required
				</span>
			</div>

			{/* Action buttons */}
			{showActions && (
				<div className="absolute top-2 right-2 flex items-center gap-1">
					<button
						onClick={(e) => { e.stopPropagation(); onEdit(); }}
						className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200"
						title="Edit"
					>
						<EditIcon className="w-3 h-3" />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation();
							const nextDay = weekDates.find(d => formatDateKey(d) > shift.date);
							if (nextDay) onDuplicate(formatDateKey(nextDay));
						}}
						className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-400 hover:text-slate-200"
						title="Duplicate"
					>
						<CopyIcon className="w-3 h-3" />
					</button>
					<button
						onClick={(e) => { e.stopPropagation(); onDelete(); }}
						className="p-1 bg-slate-700 hover:bg-red-600/50 rounded text-slate-400 hover:text-red-400"
						title="Delete"
					>
						<Trash2Icon className="w-3 h-3" />
					</button>
				</div>
			)}
		</div>
	);
}

// Shift Dialog Component
interface ShiftDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	shift: Shift | null;
	selectedDate: string | null;
	operators: Operator[];
	onSave: (shift: Omit<Shift, 'id'>) => void;
}

function ShiftDialog({ open, onOpenChange, shift, selectedDate, operators, onSave }: ShiftDialogProps) {
	const [form, setForm] = useState<Omit<Shift, 'id'>>({
		date: selectedDate || formatDateKey(new Date()),
		startTime: '06:00',
		endTime: '14:00',
		template: 'morning',
		operatorIds: [],
		requiredOperators: 2,
		notes: '',
		status: 'draft',
	});

	// Reset form when dialog opens
	useState(() => {
		if (open) {
			if (shift) {
				setForm({
					date: shift.date,
					startTime: shift.startTime,
					endTime: shift.endTime,
					template: shift.template,
					operatorIds: shift.operatorIds,
					requiredOperators: shift.requiredOperators,
					notes: shift.notes || '',
					status: shift.status,
				});
			} else {
				setForm({
					date: selectedDate || formatDateKey(new Date()),
					startTime: '06:00',
					endTime: '14:00',
					template: 'morning',
					operatorIds: [],
					requiredOperators: 2,
					notes: '',
					status: 'draft',
				});
			}
		}
	});

	// Update form when shift or selectedDate changes
	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			if (shift) {
				setForm({
					date: shift.date,
					startTime: shift.startTime,
					endTime: shift.endTime,
					template: shift.template,
					operatorIds: shift.operatorIds,
					requiredOperators: shift.requiredOperators,
					notes: shift.notes || '',
					status: shift.status,
				});
			} else {
				setForm({
					date: selectedDate || formatDateKey(new Date()),
					startTime: '06:00',
					endTime: '14:00',
					template: 'morning',
					operatorIds: [],
					requiredOperators: 2,
					notes: '',
					status: 'draft',
				});
			}
		}
		onOpenChange(isOpen);
	};

	const applyTemplate = (template: ShiftTemplate) => {
		const config = SHIFT_TEMPLATES[template];
		setForm(prev => ({
			...prev,
			template,
			startTime: config.startTime,
			endTime: config.endTime,
		}));
	};

	const toggleOperator = (operatorId: string) => {
		setForm(prev => ({
			...prev,
			operatorIds: prev.operatorIds.includes(operatorId)
				? prev.operatorIds.filter(id => id !== operatorId)
				: [...prev.operatorIds, operatorId],
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(form);
	};

	return (
		<Dialog.Root open={open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">
						{shift ? 'Edit Shift' : 'Create Shift'}
					</Dialog.Title>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Date & Status */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
								<input
									type="date"
									value={form.date}
									onChange={(e) => setForm({ ...form, date: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
								<select
									value={form.status}
									onChange={(e) => setForm({ ...form, status: e.target.value as Shift['status'] })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
								>
									<option value="draft">Draft</option>
									<option value="published">Published</option>
									<option value="in_progress">In Progress</option>
									<option value="completed">Completed</option>
								</select>
							</div>
						</div>

						{/* Shift Templates */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">Shift Template</label>
							<div className="grid grid-cols-4 gap-2">
								{(Object.entries(SHIFT_TEMPLATES) as [ShiftTemplate, typeof SHIFT_TEMPLATES['morning']][]).map(([key, config]) => {
									const Icon = config.icon;
									const isSelected = form.template === key;
									return (
										<button
											key={key}
											type="button"
											onClick={() => applyTemplate(key)}
											className={cn(
												'p-3 rounded-lg border text-center transition-all',
												isSelected
													? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
													: 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
											)}
										>
											<Icon className="w-5 h-5 mx-auto mb-1" />
											<div className="text-xs font-medium">{config.label}</div>
											<div className="text-[10px] text-slate-500 font-mono">
												{config.startTime}-{config.endTime}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Custom Time */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Start Time</label>
								<input
									type="time"
									value={form.startTime}
									onChange={(e) => setForm({ ...form, startTime: e.target.value, template: 'custom' })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">End Time</label>
								<input
									type="time"
									value={form.endTime}
									onChange={(e) => setForm({ ...form, endTime: e.target.value, template: 'custom' })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
									required
								/>
							</div>
						</div>

						{/* Required Operators */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">Required Operators</label>
							<input
								type="number"
								value={form.requiredOperators}
								onChange={(e) => setForm({ ...form, requiredOperators: parseInt(e.target.value) || 1 })}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
								min={1}
								max={10}
								required
							/>
						</div>

						{/* Operator Selection */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Assign Operators ({form.operatorIds.length}/{form.requiredOperators})
							</label>
							<div className="space-y-2 max-h-[200px] overflow-y-auto p-2 bg-slate-800/30 rounded-lg border border-slate-700">
								{operators.map(op => {
									const isSelected = form.operatorIds.includes(op.id);
									return (
										<label
											key={op.id}
											className={cn(
												'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
												isSelected ? 'bg-cyan-500/10 border border-cyan-500/30' : 'hover:bg-slate-700/50 border border-transparent'
											)}
										>
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => toggleOperator(op.id)}
												className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
											/>
											<div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-300">
												{op.name.charAt(0)}
											</div>
											<div className="flex-1">
												<div className="text-sm text-slate-200">{op.name}</div>
												<div className="text-xs text-slate-500 flex items-center gap-2">
													<span>{op.skills.join(', ')}</span>
													<span className="text-slate-600">|</span>
													<span>{op.maxHoursPerWeek}h/week max</span>
												</div>
											</div>
										</label>
									);
								})}
							</div>
							{form.operatorIds.length < form.requiredOperators && (
								<p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
									<AlertTriangleIcon className="w-3 h-3" />
									Need {form.requiredOperators - form.operatorIds.length} more operator{form.requiredOperators - form.operatorIds.length !== 1 ? 's' : ''}
								</p>
							)}
						</div>

						{/* Notes */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">Notes (optional)</label>
							<textarea
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
								rows={2}
								placeholder="Any special instructions or notes..."
							/>
						</div>

						{/* Actions */}
						<div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg font-medium hover:bg-cyan-400 transition-colors"
							>
								{shift ? 'Save Changes' : 'Create Shift'}
							</button>
						</div>
					</form>

					<Dialog.Close asChild>
						<button className="absolute top-4 right-4 text-slate-400 hover:text-slate-100">
							<XIcon className="w-5 h-5" />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
