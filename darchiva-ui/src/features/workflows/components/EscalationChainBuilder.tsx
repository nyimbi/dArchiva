// (c) Copyright Datacraft, 2026
/**
 * Escalation Chain Builder - Visual builder for multi-level escalation chains.
 * Supports drag-and-drop reordering and configurable targets per level.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	Clock,
	GripVertical,
	Layers,
	Loader2,
	Pencil,
	Plus,
	SquareUser,
	Trash2,
	User,
	Users,
	X,
} from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

interface EscalationLevel {
	id: string;
	level_order: number;
	target_type: 'user' | 'group' | 'role' | 'manager';
	target_id?: string;
	target_name?: string;
	wait_hours: number;
	notify_on_escalation: boolean;
}

interface EscalationChain {
	id: string;
	name: string;
	description?: string;
	is_active: boolean;
	levels: EscalationLevel[];
}

interface EscalationChainBuilderProps {
	workflowId?: string;
	className?: string;
}

const inputClassName =
	'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

const editableTargetTypes = ['user', 'group', 'role'] as const;

type EditableTargetType = (typeof editableTargetTypes)[number];

function createDefaultLevel(levelOrder: number): EscalationLevel {
	return {
		id: `new-${Date.now()}-${levelOrder}`,
		level_order: levelOrder,
		target_type: 'user',
		wait_hours: 24,
		notify_on_escalation: true,
	};
}

async function getEscalationChains(): Promise<EscalationChain[]> {
	const response = await apiClient.get<EscalationChain[]>('/workflows/escalation-chains');
	return response.data;
}

async function createEscalationChain(data: Omit<EscalationChain, 'id'>): Promise<EscalationChain> {
	const response = await apiClient.post<EscalationChain>('/workflows/escalation-chains', data);
	return response.data;
}

export function EscalationChainBuilder({ className }: EscalationChainBuilderProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingChain, setEditingChain] = useState<EscalationChain | null>(null);
	const queryClient = useQueryClient();

	const { data: chains, isLoading, isError } = useQuery({
		queryKey: ['escalation-chains'],
		queryFn: getEscalationChains,
	});

	const createMutation = useMutation({
		mutationFn: createEscalationChain,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['escalation-chains'] });
			setIsModalOpen(false);
			setEditingChain(null);
			toast.success('Escalation chain saved');
		},
		onError: () => {
			toast.error('Failed to save escalation chain');
		},
	});

	const handleToggleExpand = useCallback((id: string) => {
		setExpandedId(prev => prev === id ? null : id);
	}, []);

	const handleNewChain = () => {
		setEditingChain(null);
		setIsModalOpen(true);
	};

	return (
		<Card className={cn('border-slate-800 bg-slate-900/80 text-slate-200 shadow-none', className)}>
			<CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-slate-800 p-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
						<Users className="h-4 w-4" />
					</div>
					<CardTitle className="text-base text-slate-100">Escalation Chains</CardTitle>
				</div>
				<Button
					size="sm"
					className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
					onClick={handleNewChain}
				>
					<Plus className="h-4 w-4" />
					New Chain
				</Button>
			</CardHeader>

			<CardContent className="p-4">
				{isLoading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
						<Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
						Loading escalation chains...
					</div>
				) : isError ? (
					<div className="flex items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-8 text-sm text-red-300">
						<AlertCircle className="h-5 w-5" />
						Failed to load escalation chains.
					</div>
				) : !chains?.length ? (
					<div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-700 px-4 py-10 text-center text-slate-400">
						<Users className="mb-3 h-9 w-9 text-slate-500" />
						<p className="text-sm">No escalation chains defined</p>
					</div>
				) : (
					<div className="space-y-3">
						{chains.map(chain => (
							<ChainCard
								key={chain.id}
								chain={chain}
								isExpanded={expandedId === chain.id}
								onToggle={() => handleToggleExpand(chain.id)}
							/>
						))}
					</div>
				)}
			</CardContent>

			{isModalOpen && (
				<ChainModal
					chain={editingChain}
					onClose={() => { setIsModalOpen(false); setEditingChain(null); }}
					onSave={createMutation.mutate}
					isSaving={createMutation.isPending}
				/>
			)}
		</Card>
	);
}

interface ChainCardProps {
	chain: EscalationChain;
	isExpanded: boolean;
	onToggle: () => void;
}

function ChainCard({ chain, isExpanded, onToggle }: ChainCardProps) {
	const levels = chain.levels ?? [];

	return (
		<Card className="border-slate-800 bg-slate-950/70 shadow-none">
			<button
				type="button"
				className="flex w-full items-center justify-between gap-4 p-4 text-left"
				onClick={onToggle}
			>
				<div className="min-w-0 space-y-1">
					<span className="block truncate font-medium text-slate-100">{chain.name}</span>
					<span className="text-sm text-slate-400">{levels.length} levels</span>
				</div>
				<Badge
					variant="outline"
					className={cn(
						'shrink-0',
						chain.is_active
							? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
							: 'border-slate-700 bg-slate-900 text-slate-400',
					)}
				>
					{chain.is_active ? 'Active' : 'Inactive'}
				</Badge>
			</button>

			{isExpanded && (
				<div className="space-y-3 border-t border-slate-800 p-4">
					<div className="space-y-2">
						{levels.map((level, index) => (
							<LevelCard key={level.id} level={level} index={index} />
						))}
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
					>
						<Plus className="h-4 w-4" />
						Add Level
					</Button>
				</div>
			)}
		</Card>
	);
}

interface LevelCardProps {
	level: EscalationLevel;
	index: number;
}

function LevelCard({ level, index }: LevelCardProps) {
	const targetIcons: Record<EscalationLevel['target_type'], ReactNode> = {
		user: <User className="h-4 w-4" />,
		group: <Users className="h-4 w-4" />,
		role: <Layers className="h-4 w-4" />,
		manager: <SquareUser className="h-4 w-4" />,
	};

	return (
		<div className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900/70 p-3">
			<GripVertical className="h-4 w-4 shrink-0 text-slate-600" />
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-sm font-semibold text-cyan-300">
				{index + 1}
			</span>
			<div className="min-w-0 flex-1 space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-1.5 text-sm font-medium capitalize text-slate-200">
						{targetIcons[level.target_type]}
						{level.target_type}
					</span>
					<span className="text-sm text-slate-400">{level.target_name || 'Not assigned'}</span>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
					<Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-300">
						<Clock className="mr-1 h-3 w-3" />
						{level.wait_hours}h wait
					</Badge>
					<Badge
						variant="outline"
						className={cn(
							level.notify_on_escalation
								? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
								: 'border-slate-700 bg-slate-950 text-slate-500',
						)}
					>
						{level.notify_on_escalation ? 'Notify' : 'Silent'}
					</Badge>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
				>
					<Pencil className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

interface ChainModalProps {
	chain: EscalationChain | null;
	onClose: () => void;
	onSave: (data: Omit<EscalationChain, 'id'>) => void;
	isSaving: boolean;
}

function ChainModal({ chain, onClose, onSave, isSaving }: ChainModalProps) {
	const [name, setName] = useState(chain?.name || '');
	const [description, setDescription] = useState(chain?.description || '');
	const [isActive, setIsActive] = useState(chain?.is_active ?? true);
	const [levels, setLevels] = useState<EscalationLevel[]>(
		chain?.levels?.map((level, index) => ({
			...level,
			level_order: index,
		})) ?? [],
	);

	const handleAddLevel = () => {
		setLevels(prev => [...prev, createDefaultLevel(prev.length)]);
	};

	const handleRemoveLevel = (index: number) => {
		setLevels(prev => prev.filter((_, levelIndex) => levelIndex !== index));
	};

	const handleMoveLevel = (index: number, direction: -1 | 1) => {
		setLevels(prev => {
			const nextIndex = index + direction;
			if (nextIndex < 0 || nextIndex >= prev.length) {
				return prev;
			}
			const next = [...prev];
			[next[index], next[nextIndex]] = [next[nextIndex], next[index]];
			return next;
		});
	};

	const handleLevelChange = <K extends keyof EscalationLevel>(
		index: number,
		key: K,
		value: EscalationLevel[K],
	) => {
		setLevels(prev => prev.map((level, levelIndex) => (
			levelIndex === index ? { ...level, [key]: value } : level
		)));
	};

	const handleSubmit = () => {
		if (name) {
			onSave({
				name,
				description,
				is_active: isActive,
				levels: levels.map((level, index) => ({
					...level,
					level_order: index,
				})),
			});
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
			<Card
				className="w-full max-w-2xl border-slate-700 bg-slate-900 text-slate-200 shadow-xl"
				onClick={event => event.stopPropagation()}
			>
				<CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-800 p-4">
					<CardTitle className="text-base text-slate-100">{chain ? 'Edit Chain' : 'New Escalation Chain'}</CardTitle>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
						onClick={onClose}
					>
						<X className="h-4 w-4" />
					</Button>
				</CardHeader>

				<CardContent className="max-h-[75vh] space-y-4 overflow-y-auto p-4">
					<div className="space-y-2">
						<label className="text-sm font-medium text-slate-300">Chain Name</label>
						<input
							type="text"
							value={name}
							onChange={event => setName(event.target.value)}
							placeholder="e.g., Management Escalation"
							className={inputClassName}
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium text-slate-300">Description (Optional)</label>
						<input
							type="text"
							value={description}
							onChange={event => setDescription(event.target.value)}
							placeholder="Brief description"
							className={inputClassName}
						/>
					</div>

					<div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
						<span className="text-sm text-slate-300">Active</span>
						<Switch
							checked={isActive}
							onCheckedChange={setIsActive}
							className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-700"
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between gap-3">
							<label className="text-sm font-medium text-slate-300">Escalation Levels</label>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
								onClick={handleAddLevel}
							>
								<Plus className="h-4 w-4" />
								Add Level
							</Button>
						</div>

						{levels.length === 0 ? (
							<div className="rounded-md border border-dashed border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
								No levels configured
							</div>
						) : (
							<div className="space-y-2">
								{levels.map((level, index) => (
									<div
										key={level.id}
										className="grid gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-3 md:grid-cols-[auto_minmax(0,1fr)_120px_auto_auto]"
									>
										<span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-sm font-semibold text-cyan-300">
											{index + 1}
										</span>
										<div className="space-y-1">
											<label className="text-xs font-medium text-slate-500">Target Type</label>
											<select
												value={editableTargetTypes.includes(level.target_type as EditableTargetType) ? level.target_type : 'user'}
												onChange={event => handleLevelChange(index, 'target_type', event.target.value as EditableTargetType)}
												className={inputClassName}
											>
												{editableTargetTypes.map(targetType => (
													<option key={targetType} value={targetType}>
														{targetType.charAt(0).toUpperCase() + targetType.slice(1)}
													</option>
												))}
											</select>
										</div>
										<div className="space-y-1">
											<label className="text-xs font-medium text-slate-500">Wait Hours</label>
											<input
												type="number"
												min="0"
												value={level.wait_hours}
												onChange={event => handleLevelChange(index, 'wait_hours', parseInt(event.target.value, 10) || 0)}
												className={inputClassName}
											/>
										</div>
										<label className="flex items-center gap-2 self-end rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
											<input
												type="checkbox"
												checked={level.notify_on_escalation}
												onChange={event => handleLevelChange(index, 'notify_on_escalation', event.target.checked)}
												className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500"
											/>
											Notify
										</label>
										<div className="flex items-end gap-1">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
												onClick={() => handleMoveLevel(index, -1)}
												disabled={index === 0}
											>
												<ArrowUp className="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
												onClick={() => handleMoveLevel(index, 1)}
												disabled={index === levels.length - 1}
											>
												<ArrowDown className="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
												onClick={() => handleRemoveLevel(index)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>

				<div className="flex justify-end gap-2 border-t border-slate-800 p-4">
					<Button
						type="button"
						variant="ghost"
						className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
						onClick={handleSubmit}
						disabled={isSaving || !name}
					>
						{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
						{isSaving ? 'Saving...' : 'Save Chain'}
					</Button>
				</div>
			</Card>
		</div>
	);
}

export default EscalationChainBuilder;
