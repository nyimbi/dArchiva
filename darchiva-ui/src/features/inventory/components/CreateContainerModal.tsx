// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreateContainer, WarehouseLocation, PhysicalContainer } from '../api';
import styles from './CreateModal.module.css';

interface Props {
	locations: WarehouseLocation[];
	onClose: () => void;
	onCreated: (container: PhysicalContainer) => void;
}

export function CreateContainerModal({ locations, onClose, onCreated }: Props) {
	const [formData, setFormData] = useState({
		barcode: '',
		containerType: 'box',
		label: '',
		description: '',
		locationId: '',
		weightKg: '',
		width: '',
		height: '',
		depth: '',
	});

	const createContainer = useCreateContainer();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const dimensions =
			formData.width && formData.height && formData.depth
				? {
						width: parseFloat(formData.width),
						height: parseFloat(formData.height),
						depth: parseFloat(formData.depth),
				  }
				: undefined;

		const result = await createContainer.mutateAsync({
			barcode: formData.barcode,
			containerType: formData.containerType,
			label: formData.label || undefined,
			description: formData.description || undefined,
			locationId: formData.locationId || undefined,
			weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
			dimensions,
		});

		onCreated(result);
	};

	const containerTypes = [
		{ id: 'box', label: 'Box', icon: '▣' },
		{ id: 'folder', label: 'Folder', icon: '▤' },
		{ id: 'crate', label: 'Crate', icon: '▥' },
		{ id: 'pallet', label: 'Pallet', icon: '▨' },
	];

	return (
		<motion.div
			className={styles.overlay}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			onClick={onClose}
		>
			<motion.div
				className={styles.modal}
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.9, opacity: 0 }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.header}>
					<h2 className={styles.title}>New Container</h2>
					<button className={styles.closeBtn} onClick={onClose}>×</button>
				</div>

				<form onSubmit={handleSubmit} className={styles.form}>
					{/* Container Type */}
					<div className={styles.typeSelector}>
						<label className={styles.label}>Container Type</label>
						<div className={styles.typeGrid}>
							{containerTypes.map((type) => (
								<button
									key={type.id}
									type="button"
									className={`${styles.typeBtn} ${formData.containerType === type.id ? styles.active : ''}`}
									onClick={() => setFormData((prev) => ({ ...prev, containerType: type.id }))}
								>
									<span className={styles.typeIcon}>{type.icon}</span>
									{type.label}
								</button>
							))}
						</div>
					</div>

					{/* Barcode */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>
							Barcode <span className={styles.required}>*</span>
						</label>
						<input
							type="text"
							value={formData.barcode}
							onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
							placeholder="Enter or scan barcode"
							className={styles.input}
							required
						/>
					</div>

					{/* Label */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Label</label>
						<input
							type="text"
							value={formData.label}
							onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
							placeholder="Human-readable label"
							className={styles.input}
						/>
					</div>

					{/* Location */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Storage Location</label>
						<select
							value={formData.locationId}
							onChange={(e) => setFormData((prev) => ({ ...prev, locationId: e.target.value }))}
							className={styles.select}
						>
							<option value="">Select location...</option>
							{locations.map((loc) => (
								<option key={loc.id} value={loc.id}>
									{loc.path} - {loc.name}
								</option>
							))}
						</select>
					</div>

					{/* Description */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Description</label>
						<textarea
							value={formData.description}
							onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
							placeholder="Optional description..."
							className={styles.textarea}
							rows={3}
						/>
					</div>

					{/* Dimensions */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Dimensions (cm)</label>
						<div className={styles.dimensionGrid}>
							<input
								type="number"
								value={formData.width}
								onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
								placeholder="Width"
								className={styles.input}
							/>
							<span className={styles.dimensionSep}>×</span>
							<input
								type="number"
								value={formData.height}
								onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
								placeholder="Height"
								className={styles.input}
							/>
							<span className={styles.dimensionSep}>×</span>
							<input
								type="number"
								value={formData.depth}
								onChange={(e) => setFormData((prev) => ({ ...prev, depth: e.target.value }))}
								placeholder="Depth"
								className={styles.input}
							/>
						</div>
					</div>

					{/* Weight */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Weight (kg)</label>
						<input
							type="number"
							step="0.1"
							value={formData.weightKg}
							onChange={(e) => setFormData((prev) => ({ ...prev, weightKg: e.target.value }))}
							placeholder="Optional weight"
							className={styles.input}
						/>
					</div>

					{/* Actions */}
					<div className={styles.actions}>
						<button type="button" className={styles.cancelBtn} onClick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							className={styles.submitBtn}
							disabled={!formData.barcode || createContainer.isPending}
						>
							{createContainer.isPending ? 'Creating...' : 'Create Container'}
						</button>
					</div>
				</form>
			</motion.div>
		</motion.div>
	);
}

export default CreateContainerModal;
