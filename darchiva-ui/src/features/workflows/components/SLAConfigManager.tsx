// (c) Copyright Datacraft, 2026
/**
 * SLA Configuration Manager - Create and edit SLA configurations
 * for workflow deadline monitoring and escalation.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getSLAConfigs,
	createSLAConfig,
	listWorkflows,
	type SLAConfig,
	type SLAConfigCreate,
} from '../api';
import styles from './SLAConfigManager.module.css';

interface SLAConfigManagerProps {
	workflowId?: string;
	className?: string;
}

const REMINDER_THRESHOLDS = [50, 75, 90];

export function SLAConfigManager({ workflowId, className }: SLAConfigManagerProps) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const { data: configs, isLoading } = useQuery({
		queryKey: ['sla-configs', workflowId],
		queryFn: () => getSLAConfigs(workflowId),
	});

	const createMutation = useMutation({
		mutationFn: createSLAConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
			setIsModalOpen(false);
		},
	});

	const handleToggleExpand = useCallback((id: string) => {
		setExpandedId(prev => prev === id ? null : id);
	}, []);

	if (isLoading) {
		return (
			<div className={`${styles.container} ${className || ''}`}>
				<div className={styles.loading}>
					<span className={styles.spinner} />
					Loading configurations...
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
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
					</div>
					<h3>SLA Configurations</h3>
				</div>
				<button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					New Config
				</button>
			</header>

			<div className={styles.configList}>
				{!configs?.length ? (
					<div className={styles.emptyState}>
						<svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</svg>
						<p>No SLA configurations defined yet</p>
					</div>
				) : (
					configs.map(config => (
						<ConfigCard
							key={config.id}
							config={config}
							isExpanded={expandedId === config.id}
							onToggle={() => handleToggleExpand(config.id)}
						/>
					))
				)}
			</div>

			{isModalOpen && (
				<ConfigModal
					onClose={() => setIsModalOpen(false)}
					onSave={createMutation.mutate}
					isSaving={createMutation.isPending}
					workflowId={workflowId}
				/>
			)}
		</div>
	);
}

interface ConfigCardProps {
	config: SLAConfig;
	isExpanded: boolean;
	onToggle: () => void;
}

function ConfigCard({ config, isExpanded, onToggle }: ConfigCardProps) {
	return (
		<div className={styles.configCard}>
			<div className={styles.configCardHeader} onClick={onToggle}>
				<div className={styles.configInfo}>
					<span className={`${styles.statusIndicator} ${!config.is_active ? styles.inactive : ''}`} />
					<span className={styles.configName}>{config.name}</span>
					<div className={styles.configMeta}>
						<span>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
							{config.target_hours}h target
						</span>
						<span>⚠ {config.warning_threshold_percent}%</span>
						<span>🔴 {config.critical_threshold_percent}%</span>
					</div>
				</div>
				<div className={styles.configActions}>
					<button className={styles.actionBtn} onClick={e => { e.stopPropagation(); }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
					</button>
					<button className={`${styles.actionBtn} ${styles.delete}`} onClick={e => { e.stopPropagation(); }}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
					</button>
				</div>
			</div>
			{isExpanded && (
				<div className={styles.configDetails}>
					<div className={styles.detailItem}>
						<span className={styles.detailLabel}>Reminders</span>
						<span className={styles.detailValue}>
							{config.reminder_enabled ? (
								<div className={styles.thresholdBadges}>
									{config.reminder_thresholds?.map(t => (
										<span key={t} className={styles.thresholdBadge}>{t}%</span>
									))}
								</div>
							) : 'Disabled'}
						</span>
					</div>
					<div className={styles.detailItem}>
						<span className={styles.detailLabel}>Escalation Chain</span>
						<span className={styles.detailValue}>
							{config.escalation_chain_id ? 'Linked' : 'None'}
						</span>
					</div>
					<div className={styles.detailItem}>
						<span className={styles.detailLabel}>Created</span>
						<span className={styles.detailValue}>
							{new Date(config.created_at).toLocaleDateString()}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}

interface ConfigModalProps {
	onClose: () => void;
	onSave: (data: SLAConfigCreate) => void;
	isSaving: boolean;
	workflowId?: string;
}

function ConfigModal({ onClose, onSave, isSaving, workflowId }: ConfigModalProps) {
	const [formData, setFormData] = useState<SLAConfigCreate>({
		name: '',
		workflow_id: workflowId,
		target_hours: 24,
		warning_threshold_percent: 75,
		critical_threshold_percent: 90,
		reminder_enabled: true,
		reminder_thresholds: [50, 75, 90],
	});

	const { data: workflows } = useQuery({
		queryKey: ['workflows'],
		queryFn: () => listWorkflows(),
	});

	const toggleThreshold = (threshold: number) => {
		const current = formData.reminder_thresholds || [];
		const updated = current.includes(threshold)
			? current.filter(t => t !== threshold)
			: [...current, threshold].sort((a, b) => a - b);
		setFormData(prev => ({ ...prev, reminder_thresholds: updated }));
	};

	const handleSubmit = () => {
		if (formData.name && formData.target_hours > 0) {
			onSave(formData);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modal} onClick={e => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h4>New SLA Configuration</h4>
					<button className={styles.closeBtn} onClick={onClose}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>

				<div className={styles.modalBody}>
					<div className={styles.formGroup}>
						<label>Configuration Name</label>
						<input
							type="text"
							value={formData.name}
							onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
							placeholder="e.g., Standard Review SLA"
						/>
					</div>

					{!workflowId && (
						<div className={styles.formGroup}>
							<label>Workflow (Optional)</label>
							<select
								value={formData.workflow_id || ''}
								onChange={e => setFormData(prev => ({ ...prev, workflow_id: e.target.value || undefined }))}
							>
								<option value="">All Workflows</option>
								{workflows?.items.map(wf => (
									<option key={wf.id} value={wf.id}>{wf.name}</option>
								))}
							</select>
						</div>
					)}

					<div className={styles.formGroup}>
						<label>Target Hours</label>
						<input
							type="number"
							value={formData.target_hours}
							onChange={e => setFormData(prev => ({ ...prev, target_hours: parseInt(e.target.value) || 0 }))}
							min="1"
						/>
					</div>

					<div className={styles.formRow}>
						<div className={styles.formGroup}>
							<label>Warning Threshold (%)</label>
							<input
								type="number"
								value={formData.warning_threshold_percent}
								onChange={e => setFormData(prev => ({ ...prev, warning_threshold_percent: parseInt(e.target.value) || 75 }))}
								min="1"
								max="99"
							/>
						</div>
						<div className={styles.formGroup}>
							<label>Critical Threshold (%)</label>
							<input
								type="number"
								value={formData.critical_threshold_percent}
								onChange={e => setFormData(prev => ({ ...prev, critical_threshold_percent: parseInt(e.target.value) || 90 }))}
								min="1"
								max="99"
							/>
						</div>
					</div>

					<div className={styles.toggleGroup}>
						<span>Enable Reminders</span>
						<div
							className={`${styles.toggle} ${formData.reminder_enabled ? styles.active : ''}`}
							onClick={() => setFormData(prev => ({ ...prev, reminder_enabled: !prev.reminder_enabled }))}
						/>
					</div>

					{formData.reminder_enabled && (
						<div className={styles.thresholdGroup}>
							<label className={styles.formGroup}>Reminder Thresholds</label>
							<div className={styles.thresholdOptions}>
								{REMINDER_THRESHOLDS.map(threshold => (
									<button
										key={threshold}
										type="button"
										className={`${styles.thresholdOption} ${formData.reminder_thresholds?.includes(threshold) ? styles.selected : ''}`}
										onClick={() => toggleThreshold(threshold)}
									>
										{threshold}%
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				<div className={styles.modalFooter}>
					<button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
					<button
						className={styles.saveBtn}
						onClick={handleSubmit}
						disabled={isSaving || !formData.name}
					>
						{isSaving ? 'Saving...' : 'Create Configuration'}
					</button>
				</div>
			</div>
		</div>
	);
}

export default SLAConfigManager;
