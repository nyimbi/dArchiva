// (c) Copyright Datacraft, 2026
/**
 * Escalation Chain Builder - Visual builder for multi-level escalation chains.
 * Supports drag-and-drop reordering and configurable targets per level.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import styles from './EscalationChainBuilder.module.css';

// Types
interface EscalationLevel {
	id: string;
	level_order: number;
	target_type: 'user' | 'role' | 'manager';
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
	className?: string;
}

// API Functions
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

	const { data: chains, isLoading } = useQuery({
		queryKey: ['escalation-chains'],
		queryFn: getEscalationChains,
	});

	const createMutation = useMutation({
		mutationFn: createEscalationChain,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['escalation-chains'] });
			setIsModalOpen(false);
			setEditingChain(null);
		},
	});

	const handleToggleExpand = useCallback((id: string) => {
		setExpandedId(prev => prev === id ? null : id);
	}, []);

	const handleNewChain = () => {
		setEditingChain(null);
		setIsModalOpen(true);
	};

	if (isLoading) {
		return (
			<div className={`${styles.container} ${className || ''}`}>
				<div className={styles.loading}>
					<span className={styles.spinner} />
					Loading escalation chains...
				</div>
			</div>
		);
	}

	return (
		<div className={`${styles.container} ${className || ''}`}>
			<header className={styles.header}>
				<div className={styles.headerTitle}>
					<div className={styles.headerIcon}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</div>
					<h3>Escalation Chains</h3>
				</div>
				<div className={styles.headerActions}>
					<button className={styles.addButton} onClick={handleNewChain}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						New Chain
					</button>
				</div>
			</header>

			<div className={styles.chainList}>
				{!chains?.length ? (
					<div className={styles.emptyState}>
						<svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
						<p>No escalation chains defined</p>
					</div>
				) : (
					chains.map(chain => (
						<ChainCard
							key={chain.id}
							chain={chain}
							isExpanded={expandedId === chain.id}
							onToggle={() => handleToggleExpand(chain.id)}
						/>
					))
				)}
			</div>

			{isModalOpen && (
				<ChainModal
					chain={editingChain}
					onClose={() => { setIsModalOpen(false); setEditingChain(null); }}
					onSave={createMutation.mutate}
					isSaving={createMutation.isPending}
				/>
			)}
		</div>
	);
}

interface ChainCardProps {
	chain: EscalationChain;
	isExpanded: boolean;
	onToggle: () => void;
}

function ChainCard({ chain, isExpanded, onToggle }: ChainCardProps) {
	return (
		<div className={styles.chainCard}>
			<div className={styles.chainCardHeader} onClick={onToggle}>
				<div className={styles.chainInfo}>
					<span className={styles.chainName}>{chain.name}</span>
					<span className={styles.levelCount}>{chain.levels.length} levels</span>
				</div>
				<span className={`${styles.statusBadge} ${chain.is_active ? styles.active : styles.inactive}`}>
					{chain.is_active ? 'Active' : 'Inactive'}
				</span>
			</div>

			{isExpanded && (
				<div className={styles.levelsContainer}>
					<div className={styles.levels}>
						{chain.levels.map((level, idx) => (
							<LevelCard key={level.id} level={level} index={idx} />
						))}
					</div>
					<button className={styles.addLevelBtn}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Add Level
					</button>
				</div>
			)}
		</div>
	);
}

interface LevelCardProps {
	level: EscalationLevel;
	index: number;
}

function LevelCard({ level, index }: LevelCardProps) {
	const targetIcons: Record<string, JSX.Element> = {
		user: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
		),
		role: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path d="M12 2L2 7l10 5 10-5-10-5z" />
				<path d="M2 17l10 5 10-5" />
				<path d="M2 12l10 5 10-5" />
			</svg>
		),
		manager: (
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				<line x1="3" y1="9" x2="21" y2="9" />
				<line x1="9" y1="21" x2="9" y2="9" />
			</svg>
		),
	};

	return (
		<div className={styles.levelCard}>
			<div className={styles.dragHandle}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="9" cy="6" r="1" fill="currentColor" />
					<circle cx="15" cy="6" r="1" fill="currentColor" />
					<circle cx="9" cy="12" r="1" fill="currentColor" />
					<circle cx="15" cy="12" r="1" fill="currentColor" />
					<circle cx="9" cy="18" r="1" fill="currentColor" />
					<circle cx="15" cy="18" r="1" fill="currentColor" />
				</svg>
			</div>
			<span className={styles.levelNumber}>{index + 1}</span>
			<div className={styles.levelContent}>
				<div className={styles.levelTarget}>
					<span className={styles.targetIcon}>{targetIcons[level.target_type]}</span>
					<span className={styles.targetType}>{level.target_type}</span>
					<span className={styles.targetName}>{level.target_name || 'Not assigned'}</span>
				</div>
				<span className={styles.waitTime}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					{level.wait_hours}h wait
				</span>
				<span className={`${styles.notifyBadge} ${!level.notify_on_escalation ? styles.off : ''}`}>
					{level.notify_on_escalation ? 'Notify' : 'Silent'}
				</span>
			</div>
			<div className={styles.levelActions}>
				<button className={styles.levelActionBtn}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
				</button>
				<button className={`${styles.levelActionBtn} ${styles.delete}`}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
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

	const handleSubmit = () => {
		if (name) {
			onSave({ name, description, is_active: isActive, levels: chain?.levels || [] });
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modal} onClick={e => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h4>{chain ? 'Edit Chain' : 'New Escalation Chain'}</h4>
					<button className={styles.closeBtn} onClick={onClose}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				<div className={styles.modalBody}>
					<div className={styles.formGroup}>
						<label>Chain Name</label>
						<input
							type="text"
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="e.g., Management Escalation"
						/>
					</div>

					<div className={styles.formGroup}>
						<label>Description (Optional)</label>
						<input
							type="text"
							value={description}
							onChange={e => setDescription(e.target.value)}
							placeholder="Brief description"
						/>
					</div>

					<div className={styles.toggleGroup}>
						<span>Active</span>
						<div
							className={`${styles.toggle} ${isActive ? styles.active : ''}`}
							onClick={() => setIsActive(!isActive)}
						/>
					</div>
				</div>

				<div className={styles.modalFooter}>
					<button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
					<button
						className={styles.saveBtn}
						onClick={handleSubmit}
						disabled={isSaving || !name}
					>
						{isSaving ? 'Saving...' : 'Save Chain'}
					</button>
				</div>
			</div>
		</div>
	);
}

export default EscalationChainBuilder;
