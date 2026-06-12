// (c) Copyright Datacraft, 2026
import { useScanners } from '@/features/scanner/api/hooks';
import type { ScannerStatus } from '@/features/scanner/types';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon,
  MonitorIcon,
  PackageIcon,
  PlusIcon,
  PrinterIcon,
  RefreshCwIcon,
  WrenchIcon,
  XCircleIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react';
import { useMemo,useState } from 'react';
import { toast } from 'sonner';
import { useBatches,useBulkUpdateBatches,useProject } from '../../api/hooks';
import { MetricCard } from '../core/MetricCard';
import { ProgressRing } from '../core/ProgressRing';

// Equipment status types
type EquipmentStatus = 'available' | 'busy' | 'maintenance' | 'offline';
type EquipmentType = 'scanner' | 'workstation';

interface Equipment {
	id: string;
	name: string;
	type: EquipmentType;
	model: string;
	serial_number: string;
	status: EquipmentStatus;
	location_id?: string;
	location_name?: string;
	current_project_id?: string;
	current_project_name?: string;
	current_batch_id?: string;
	current_batch_number?: string;
	operator_name?: string;
	pages_today: number;
	utilization_percent: number;
	last_maintenance_date?: string;
	next_maintenance_date?: string;
	hours_in_use_today: number;
	avg_pages_per_hour: number;
}

interface EquipmentAssignment {
	id: string;
	equipment_id: string;
	equipment_name: string;
	equipment_type: EquipmentType;
	project_id: string;
	project_name: string;
	batch_id?: string;
	batch_number?: string;
	assigned_at: string;
	assigned_by_name?: string;
	status: 'active' | 'completed' | 'paused';
	pages_processed: number;
	estimated_pages?: number;
}

interface AssignmentTarget {
	id: string;
	name: string;
	type: 'project' | 'batch';
	project_name?: string;
	estimated_pages?: number;
}

interface EquipmentAssignmentTabProps {
	projectId: string;
}

function mapEquipmentStatus(scannerStatus: ScannerStatus, assignedBatchId?: string): EquipmentStatus {
	if (scannerStatus === 'maintenance') return 'maintenance';
	if (scannerStatus === 'offline' || scannerStatus === 'error') return 'offline';
	if (scannerStatus === 'busy' || assignedBatchId) return 'busy';
	return 'available';
}

const statusConfig: Record<EquipmentStatus, { bg: string; text: string; border: string; dot: string; label: string }> = {
	available: {
		bg: 'bg-emerald-500/10',
		text: 'text-emerald-400',
		border: 'border-emerald-500/30',
		dot: 'bg-emerald-400',
		label: 'Available',
	},
	busy: {
		bg: 'bg-cyan-500/10',
		text: 'text-cyan-400',
		border: 'border-cyan-500/30',
		dot: 'bg-cyan-400',
		label: 'In Use',
	},
	maintenance: {
		bg: 'bg-amber-500/10',
		text: 'text-amber-400',
		border: 'border-amber-500/30',
		dot: 'bg-amber-400',
		label: 'Maintenance',
	},
	offline: {
		bg: 'bg-slate-500/10',
		text: 'text-slate-400',
		border: 'border-slate-500/30',
		dot: 'bg-slate-400',
		label: 'Offline',
	},
};

function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
	const config = statusConfig[status];
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium rounded border',
				config.bg,
				config.text,
				config.border
			)}
		>
			<span className={cn('w-1.5 h-1.5 rounded-full', config.dot, status === 'busy' && 'animate-pulse')} />
			{config.label}
		</span>
	);
}

function EquipmentIcon({ type, className }: { type: EquipmentType; className?: string }) {
	return type === 'scanner' ? (
		<PrinterIcon className={cn('w-5 h-5', className)} />
	) : (
		<MonitorIcon className={cn('w-5 h-5', className)} />
	);
}

export function EquipmentAssignmentTab({ projectId }: EquipmentAssignmentTabProps) {
	const { data: scanners = [] } = useScanners();
	const { data: project } = useProject(projectId);
	const { data: batchesResponse } = useBatches(projectId);
	const assignScannerMutation = useBulkUpdateBatches();
	const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
	const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
	const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
	const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all');

	const batches = useMemo(() => batchesResponse?.items ?? [], [batchesResponse?.items]);
	const activeAssignmentsByScanner = useMemo(() => {
		const map = new Map<string, typeof batches[number]>();
		for (const batch of batches) {
			if (!batch.scanner_id || batch.status === 'completed' || batch.status === 'failed') {
				continue;
			}
			if (!map.has(batch.scanner_id)) {
				map.set(batch.scanner_id, batch);
			}
		}
		return map;
	}, [batches]);

	const assignments = useMemo<EquipmentAssignment[]>(() => {
		return batches
			.filter((batch) => !!batch.scanner_id)
			.map((batch) => {
				const scanner = scanners.find((s) => s.id === batch.scanner_id);
				return {
					id: `assignment-${batch.id}`,
					equipment_id: batch.scanner_id || '',
					equipment_name: scanner?.name || 'Unknown Scanner',
					equipment_type: 'scanner',
					project_id: batch.project_id,
					project_name: project?.name || `Project ${batch.project_id}`,
					batch_id: batch.id,
					batch_number: batch.batch_number,
					assigned_at: batch.started_at || batch.created_at,
					assigned_by_name: batch.assigned_operator_name || 'System',
					status: batch.status === 'completed' ? 'completed' : batch.status === 'on_hold' ? 'paused' : 'active',
					pages_processed: batch.scanned_pages,
					estimated_pages: batch.total_pages,
				};
			});
	}, [batches, project?.name, scanners]);

	const equipment = useMemo<Equipment[]>(() => {
		return scanners.map((scanner) => {
			const activeAssignment = activeAssignmentsByScanner.get(scanner.id);
			const pagesToday = batches
				.filter((batch) => batch.scanner_id === scanner.id)
				.reduce((sum, batch) => sum + (batch.scanned_pages || 0), 0);
			const hoursInUse = Math.max(0, Math.min(8, Math.round((pagesToday / 450) * 10) / 10));
			const status = mapEquipmentStatus(scanner.status, activeAssignment?.id);
			const utilization = status === 'busy' ? 80 : status === 'available' ? 30 : 0;

			return {
				id: scanner.id,
				name: scanner.name,
				type: 'scanner',
				model: scanner.model || 'Unknown Model',
				serial_number: scanner.serial_number || '-',
				status,
				location_name: scanner.location_id || 'Unassigned',
				current_project_id: activeAssignment?.project_id,
				current_project_name: activeAssignment ? (project?.name || `Project ${activeAssignment.project_id}`) : undefined,
				current_batch_id: activeAssignment?.id,
				current_batch_number: activeAssignment?.batch_number,
				operator_name: activeAssignment?.assigned_operator_name,
				pages_today: pagesToday,
				utilization_percent: utilization,
				last_maintenance_date: scanner.updated_at,
				next_maintenance_date: undefined,
				hours_in_use_today: hoursInUse,
				avg_pages_per_hour: status === 'busy' && hoursInUse > 0 ? Math.round(pagesToday / hoursInUse) : 0,
			};
		});
	}, [activeAssignmentsByScanner, batches, project?.name, scanners]);

	const targets = useMemo<AssignmentTarget[]>(() => {
		const batchTargets = batches.map((batch) => ({
			id: batch.id,
			name: batch.batch_number,
			type: 'batch' as const,
			project_name: project?.name,
			estimated_pages: batch.total_pages,
		}));
		const projectTarget: AssignmentTarget[] = project
			? [{
				id: project.id,
				name: project.name,
				type: 'project',
				estimated_pages: project.total_estimated_pages,
			}]
			: [{
				id: projectId,
				name: `Project ${projectId}`,
				type: 'project',
			}];

		return [...projectTarget, ...batchTargets];
	}, [batches, project, projectId]);

	// Calculate metrics
	const metrics = useMemo(() => {
		const scanners = equipment.filter(e => e.type === 'scanner');
		const workstations = equipment.filter(e => e.type === 'workstation');
		const available = equipment.filter(e => e.status === 'available').length;
		const busy = equipment.filter(e => e.status === 'busy').length;
		const maintenance = equipment.filter(e => e.status === 'maintenance').length;
		const offline = equipment.filter(e => e.status === 'offline').length;
		const totalPagesToday = equipment.reduce((sum, e) => sum + e.pages_today, 0);
		const avgUtilization = equipment.length > 0
			? equipment.reduce((sum, e) => sum + e.utilization_percent, 0) / equipment.length
			: 0;
		const totalHoursInUse = equipment.reduce((sum, e) => sum + e.hours_in_use_today, 0);

		return {
			total: equipment.length,
			scanners: scanners.length,
			workstations: workstations.length,
			available,
			busy,
			maintenance,
			offline,
			totalPagesToday,
			avgUtilization: Math.round(avgUtilization),
			totalHoursInUse: totalHoursInUse.toFixed(1),
		};
	}, [equipment]);

	// Filter equipment
	const filteredEquipment = useMemo(() => {
		return equipment.filter(e => {
			if (statusFilter !== 'all' && e.status !== statusFilter) return false;
			if (typeFilter !== 'all' && e.type !== typeFilter) return false;
			return true;
		});
	}, [equipment, statusFilter, typeFilter]);

	const handleAssignEquipment = (equip: Equipment) => {
		setSelectedEquipment(equip);
		setAssignmentDialogOpen(true);
	};

	const handleAssign = async (equipmentId: string, targetId: string, targetType: 'project' | 'batch') => {
		const targetBatchIds =
			targetType === 'batch'
				? [targetId]
				: batches.map((batch) => batch.id);

		if (targetBatchIds.length === 0) {
			toast.error('No batches available to assign');
			return;
		}

		try {
			await assignScannerMutation.mutateAsync({
				batch_ids: targetBatchIds,
				updates: { scanner_id: equipmentId },
			});
			toast.success(targetType === 'batch' ? 'Scanner assigned to batch' : 'Scanner assigned to project batches');
			setAssignmentDialogOpen(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to assign scanner');
		}
	};

	return (
		<div className="space-y-6">
			{/* Utilization Metrics */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<MetricCard
					label="Total Equipment"
					value={metrics.total}
					icon={<PackageIcon className="w-4 h-4" />}
					sublabel={`${metrics.scanners} scanners, ${metrics.workstations} workstations`}
				/>
				<MetricCard
					label="Available Now"
					value={metrics.available}
					icon={<CheckCircleIcon className="w-4 h-4" />}
					accent="emerald"
				/>
				<MetricCard
					label="Pages Today"
					value={metrics.totalPagesToday.toLocaleString()}
					icon={<ActivityIcon className="w-4 h-4" />}
					accent="cyan"
				/>
				<MetricCard
					label="Avg Utilization"
					value={`${metrics.avgUtilization}%`}
					icon={<ZapIcon className="w-4 h-4" />}
					accent={metrics.avgUtilization >= 70 ? 'emerald' : metrics.avgUtilization >= 40 ? 'amber' : 'red'}
				/>
			</div>

			{/* Utilization Overview */}
			<div className="bg-white/[0.02] border border-white/10 rounded-lg p-5">
				<h3 className="font-semibold text-white mb-4 flex items-center gap-2">
					<ActivityIcon className="w-4 h-4 text-cyan-400" />
					Equipment Utilization Overview
				</h3>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
					<div className="flex flex-col items-center">
						<ProgressRing
							value={metrics.busy}
							max={metrics.total}
							size={100}
							color="cyan"
							label="In Use"
							sublabel={`${metrics.busy}/${metrics.total}`}
						/>
					</div>
					<div className="flex flex-col items-center">
						<ProgressRing
							value={metrics.available}
							max={metrics.total}
							size={100}
							color="emerald"
							label="Available"
							sublabel={`${metrics.available}/${metrics.total}`}
						/>
					</div>
					<div className="flex flex-col items-center">
						<ProgressRing
							value={metrics.maintenance}
							max={metrics.total}
							size={100}
							color="amber"
							label="Maintenance"
							sublabel={`${metrics.maintenance}/${metrics.total}`}
						/>
					</div>
					<div className="flex flex-col items-center">
						<ProgressRing
							value={metrics.avgUtilization}
							max={100}
							size={100}
							color={metrics.avgUtilization >= 70 ? 'emerald' : metrics.avgUtilization >= 40 ? 'cyan' : 'red'}
							label="Utilization"
							sublabel={`${metrics.totalHoursInUse}h today`}
						/>
					</div>
				</div>
			</div>

			{/* Current Assignments */}
			<div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
				<div className="p-4 border-b border-white/10 flex items-center justify-between">
					<h3 className="font-semibold text-white flex items-center gap-2">
						<ArrowRightIcon className="w-4 h-4 text-cyan-400" />
						Current Assignments
					</h3>
					<span className="text-xs text-white/40 font-mono">{assignments.length} active</span>
				</div>
				<div className="divide-y divide-white/5">
					{assignments.length === 0 ? (
						<div className="p-6 text-center text-white/40">No active assignments</div>
					) : (
						assignments.map(assignment => (
							<div key={assignment.id} className="p-4 hover:bg-white/[0.02] transition-colors">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
											<EquipmentIcon type={assignment.equipment_type} className="text-white/40" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium text-white">{assignment.equipment_name}</span>
												<ArrowRightIcon className="w-3 h-3 text-white/30" />
												<span className="text-cyan-400">{assignment.project_name}</span>
											</div>
											<div className="flex items-center gap-3 text-xs text-white/50">
												{assignment.batch_number && (
													<span className="flex items-center gap-1">
														<FolderIcon className="w-3 h-3" />
														{assignment.batch_number}
													</span>
												)}
												<span>Assigned by {assignment.assigned_by_name}</span>
												<span className="font-mono">
													{new Date(assignment.assigned_at).toLocaleTimeString()}
												</span>
											</div>
										</div>
									</div>
									<div className="text-right">
										<div className="text-sm font-mono text-white">
											{assignment.pages_processed.toLocaleString()} pages
										</div>
										{assignment.estimated_pages && (
											<div className="text-xs text-white/40">
												of {assignment.estimated_pages.toLocaleString()} estimated
											</div>
										)}
									</div>
								</div>
								{assignment.estimated_pages && (
									<div className="mt-3 pt-3 border-t border-white/5">
										<div className="flex items-center gap-2">
											<div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
												<div
													className="h-full bg-cyan-400 rounded-full transition-all duration-500"
													style={{
														width: `${Math.min(100, (assignment.pages_processed / assignment.estimated_pages) * 100)}%`,
													}}
												/>
											</div>
											<span className="text-xs font-mono text-white/50">
												{Math.round((assignment.pages_processed / assignment.estimated_pages) * 100)}%
											</span>
										</div>
									</div>
								)}
							</div>
						))
					)}
				</div>
			</div>

			{/* Equipment List */}
			<div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
				{/* Header with filters */}
				<div className="p-4 border-b border-white/10">
					<div className="flex items-center justify-between mb-3">
						<h3 className="font-semibold text-white">Equipment Inventory</h3>
						<button
							onClick={() => setAssignmentDialogOpen(true)}
							className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors"
						>
							<PlusIcon className="w-4 h-4" />
							New Assignment
						</button>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<span className="text-xs text-white/40">Status:</span>
							<div className="flex gap-1">
								{(['all', 'available', 'busy', 'maintenance', 'offline'] as const).map(status => (
									<button
										key={status}
										onClick={() => setStatusFilter(status)}
										className={cn(
											'px-2 py-1 text-xs rounded transition-colors',
											statusFilter === status
												? 'bg-white/10 text-white'
												: 'text-white/40 hover:text-white/70'
										)}
									>
										{status === 'all' ? 'All' : statusConfig[status as EquipmentStatus].label}
									</button>
								))}
							</div>
						</div>
						<div className="h-4 w-px bg-white/10" />
						<div className="flex items-center gap-2">
							<span className="text-xs text-white/40">Type:</span>
							<div className="flex gap-1">
								{(['all', 'scanner', 'workstation'] as const).map(type => (
									<button
										key={type}
										onClick={() => setTypeFilter(type)}
										className={cn(
											'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
											typeFilter === type
												? 'bg-white/10 text-white'
												: 'text-white/40 hover:text-white/70'
										)}
									>
										{type !== 'all' && <EquipmentIcon type={type} className="w-3 h-3" />}
										{type === 'all' ? 'All' : type === 'scanner' ? 'Scanners' : 'Workstations'}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Equipment list */}
				<div className="divide-y divide-white/5">
					{filteredEquipment.length === 0 ? (
						<div className="p-6 text-center text-white/40">No equipment matches filters</div>
					) : (
						filteredEquipment.map(equip => (
							<div
								key={equip.id}
								className={cn(
									'p-4 hover:bg-white/[0.02] transition-colors',
									equip.status === 'maintenance' && 'border-l-2 border-l-amber-400',
									equip.status === 'offline' && 'opacity-60'
								)}
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-start gap-3">
										<div
											className={cn(
												'w-12 h-12 rounded-lg flex items-center justify-center',
												equip.status === 'busy' ? 'bg-cyan-500/10' : 'bg-white/5'
											)}
										>
											<EquipmentIcon
												type={equip.type}
												className={cn(
													equip.status === 'busy' ? 'text-cyan-400' : 'text-white/40'
												)}
											/>
										</div>
										<div>
											<div className="flex items-center gap-2 mb-1">
												<h4 className="font-medium text-white">{equip.name}</h4>
												<EquipmentStatusBadge status={equip.status} />
											</div>
											<p className="text-xs text-white/40 mb-1">
												{equip.model} | S/N: {equip.serial_number}
											</p>
											<p className="text-xs text-white/50">
												{equip.location_name}
												{equip.current_project_name && (
													<>
														{' '}
														<span className="text-cyan-400">
															| {equip.current_project_name}
														</span>
													</>
												)}
												{equip.operator_name && (
													<span className="text-white/40"> | {equip.operator_name}</span>
												)}
											</p>
										</div>
									</div>
									<div className="text-right">
										{equip.status === 'busy' || equip.pages_today > 0 ? (
											<>
												<div className="text-lg font-mono font-bold text-white">
													{equip.pages_today.toLocaleString()}
												</div>
												<div className="text-xs text-white/40">pages today</div>
											</>
										) : equip.status === 'maintenance' ? (
											<>
												<WrenchIcon className="w-5 h-5 text-amber-400 ml-auto mb-1" />
												<div className="text-xs text-amber-400">Under maintenance</div>
											</>
										) : equip.status === 'offline' ? (
											<>
												<XCircleIcon className="w-5 h-5 text-slate-400 ml-auto mb-1" />
												<div className="text-xs text-slate-400">Offline</div>
											</>
										) : (
											<>
												<CheckCircleIcon className="w-5 h-5 text-emerald-400 ml-auto mb-1" />
												<div className="text-xs text-emerald-400">Ready to assign</div>
											</>
										)}
									</div>
								</div>

								{/* Stats row */}
								<div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
									<div className="flex items-center gap-4 text-xs text-white/50">
										<span className="flex items-center gap-1">
											<ActivityIcon className="w-3 h-3" />
											{equip.utilization_percent}% utilization
										</span>
										<span className="flex items-center gap-1">
											<ClockIcon className="w-3 h-3" />
											{equip.hours_in_use_today}h in use
										</span>
										<span className="flex items-center gap-1">
											<ZapIcon className="w-3 h-3" />
											{equip.avg_pages_per_hour} pages/hr avg
										</span>
									</div>
									{equip.status === 'available' && (
										<button
											onClick={() => handleAssignEquipment(equip)}
											className="px-3 py-1 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded transition-colors"
										>
											Assign
										</button>
									)}
									{equip.status === 'busy' && (
										<button className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded transition-colors flex items-center gap-1">
											<RefreshCwIcon className="w-3 h-3" />
											Reassign
										</button>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Assignment Dialog */}
				<AssignmentDialog
					open={assignmentDialogOpen}
					onOpenChange={setAssignmentDialogOpen}
					equipment={selectedEquipment || equipment.find(e => e.status === 'available')}
					availableEquipment={equipment.filter(e => e.status === 'available')}
					targets={targets}
					onAssign={handleAssign}
				/>
			</div>
		);
}

interface AssignmentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipment: Equipment | undefined;
	availableEquipment: Equipment[];
	targets: AssignmentTarget[];
	onAssign: (equipmentId: string, targetId: string, targetType: 'project' | 'batch') => void;
}

function AssignmentDialog({
	open,
	onOpenChange,
	equipment,
	availableEquipment,
	targets,
	onAssign,
}: AssignmentDialogProps) {
	const [selectedEquipmentId, setSelectedEquipmentId] = useState(equipment?.id || '');
	const [selectedTargetId, setSelectedTargetId] = useState('');
	const [targetType, setTargetType] = useState<'project' | 'batch'>('project');

	const filteredTargets = targets.filter(t => t.type === targetType);
	const selectedTarget = targets.find(t => t.id === selectedTargetId);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedEquipmentId && selectedTargetId) {
			onAssign(selectedEquipmentId, selectedTargetId, targetType);
		}
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-1">
						Assign Equipment
					</Dialog.Title>
					<Dialog.Description className="text-sm text-slate-400 mb-4">
						Assign a scanner or workstation to a project or batch.
					</Dialog.Description>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Equipment Selection */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Select Equipment
							</label>
							<div className="grid grid-cols-2 gap-2">
								{availableEquipment.map(equip => (
									<button
										key={equip.id}
										type="button"
										onClick={() => setSelectedEquipmentId(equip.id)}
										className={cn(
											'p-3 rounded-lg border text-left transition-colors',
											selectedEquipmentId === equip.id
												? 'bg-cyan-500/10 border-cyan-500/50 text-white'
												: 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
										)}
									>
										<div className="flex items-center gap-2 mb-1">
											<EquipmentIcon type={equip.type} className="w-4 h-4" />
											<span className="font-medium text-sm">{equip.name}</span>
										</div>
										<p className="text-xs text-slate-500">{equip.model}</p>
									</button>
								))}
							</div>
							{availableEquipment.length === 0 && (
								<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-center">
									<AlertTriangleIcon className="w-5 h-5 text-amber-400 mx-auto mb-2" />
									<p className="text-sm text-slate-400">No equipment available</p>
								</div>
							)}
						</div>

						{/* Target Type Toggle */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">Assign To</label>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => {
										setTargetType('project');
										setSelectedTargetId('');
									}}
									className={cn(
										'flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors',
										targetType === 'project'
											? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
											: 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
									)}
								>
									Project
								</button>
								<button
									type="button"
									onClick={() => {
										setTargetType('batch');
										setSelectedTargetId('');
									}}
									className={cn(
										'flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors',
										targetType === 'batch'
											? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
											: 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
									)}
								>
									Batch
								</button>
							</div>
						</div>

						{/* Target Selection */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Select {targetType === 'project' ? 'Project' : 'Batch'}
							</label>
							<select
								value={selectedTargetId}
								onChange={e => setSelectedTargetId(e.target.value)}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
								required
							>
								<option value="">
									Choose a {targetType}...
								</option>
								{filteredTargets.map(target => (
									<option key={target.id} value={target.id}>
										{target.name}
										{target.project_name && ` (${target.project_name})`}
										{target.estimated_pages && ` - ${target.estimated_pages.toLocaleString()} pages`}
									</option>
								))}
							</select>
						</div>

						{/* Preview */}
						{selectedEquipmentId && selectedTargetId && (
							<div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
								<div className="flex items-center gap-2 text-sm">
									<span className="text-white font-medium">
										{availableEquipment.find(e => e.id === selectedEquipmentId)?.name}
									</span>
									<ArrowRightIcon className="w-4 h-4 text-slate-500" />
									<span className="text-cyan-400 font-medium">{selectedTarget?.name}</span>
								</div>
								{selectedTarget?.estimated_pages && (
									<p className="text-xs text-slate-500 mt-1">
										~{selectedTarget.estimated_pages.toLocaleString()} pages to process
									</p>
								)}
							</div>
						)}

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
								disabled={!selectedEquipmentId || !selectedTargetId}
								className="px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Assign Equipment
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
