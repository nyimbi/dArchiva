// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCreateTemplate,useDeleteTemplate,useIngestionTemplates } from '../api';
import styles from './IngestionTemplates.module.css';

export function IngestionTemplates() {
	const [isCreating, setIsCreating] = useState(false);
	const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
	const [newTemplate, setNewTemplate] = useState({
		name: '',
		description: '',
		applyOcr: true,
		autoClassify: false,
		duplicateCheck: true,
	});

	const { data, isLoading } = useIngestionTemplates();
	const createTemplate = useCreateTemplate();
	const deleteTemplate = useDeleteTemplate();

	const handleCreate = async () => {
		if (!newTemplate.name.trim()) return;
		await createTemplate.mutateAsync(newTemplate);
		setNewTemplate({ name: '', description: '', applyOcr: true, autoClassify: false, duplicateCheck: true });
		setIsCreating(false);
	};

	const handleDelete = async (id: string) => {
		setConfirmDialog({ message: 'Delete this template?', onConfirm: () => deleteTemplate.mutate(id) });
	};

	if (isLoading) {
		return <div className={styles.loading}>Loading templates...</div>;
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h3>Ingestion Templates</h3>
				<button onClick={() => setIsCreating(true)} className={styles.addBtn}>
					+ New Template
				</button>
			</div>

			{isCreating && (
				<div className={styles.createForm}>
					<input
						type="text"
						placeholder="Template name"
						value={newTemplate.name}
						onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
						className={styles.input}
					/>
					<textarea
						placeholder="Description (optional)"
						value={newTemplate.description}
						onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
						className={styles.textarea}
						rows={2}
					/>
					<div className={styles.checkboxGroup}>
						<label className={styles.checkbox}>
							<input
								type="checkbox"
								checked={newTemplate.applyOcr}
								onChange={(e) => setNewTemplate({ ...newTemplate, applyOcr: e.target.checked })}
							/>
							<span>Apply OCR</span>
						</label>
						<label className={styles.checkbox}>
							<input
								type="checkbox"
								checked={newTemplate.autoClassify}
								onChange={(e) => setNewTemplate({ ...newTemplate, autoClassify: e.target.checked })}
							/>
							<span>Auto-classify</span>
						</label>
						<label className={styles.checkbox}>
							<input
								type="checkbox"
								checked={newTemplate.duplicateCheck}
								onChange={(e) => setNewTemplate({ ...newTemplate, duplicateCheck: e.target.checked })}
							/>
							<span>Check duplicates</span>
						</label>
					</div>
					<div className={styles.formActions}>
						<button onClick={() => setIsCreating(false)} className={styles.cancelBtn}>Cancel</button>
						<button onClick={handleCreate} disabled={createTemplate.isPending} className={styles.saveBtn}>
							{createTemplate.isPending ? 'Creating...' : 'Create'}
						</button>
					</div>
				</div>
			)}

			<div className={styles.templateList}>
				{data?.items.length === 0 && (
					<p className={styles.empty}>No templates yet. Create one to get started.</p>
				)}
				{data?.items.map((template) => (
					<div key={template.id} className={styles.templateCard}>
						<div className={styles.templateHeader}>
							<h4>{template.name}</h4>
							<button onClick={() => handleDelete(template.id)} className={styles.deleteBtn}>
								Delete
							</button>
						</div>
						{template.description && <p className={styles.description}>{template.description}</p>}
						<div className={styles.tags}>
							{template.applyOcr && <span className={styles.tag}>OCR</span>}
							{template.autoClassify && <span className={styles.tag}>Auto-classify</span>}
							{template.duplicateCheck && <span className={styles.tag}>Dup check</span>}
						</div>
					</div>
				))}
			</div>
			<AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm</AlertDialogTitle>
						<AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
							className="bg-red-600 hover:bg-red-700"
						>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export default IngestionTemplates;
