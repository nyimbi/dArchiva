// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreateLocation, WarehouseLocation } from '../api';
import styles from './CreateModal.module.css';

interface Props {
	locations: WarehouseLocation[];
	onClose: () => void;
	onCreated: (location: WarehouseLocation) => void;
}

export function CreateLocationModal({ locations, onClose, onCreated }: Props) {
	const [formData, setFormData] = useState({
		code: '',
		name: '',
		description: '',
		parentId: '',
		capacity: '',
		aisle: '',
		bay: '',
		shelfNumber: '',
		position: '',
		climateControlled: false,
		fireSuppression: false,
		accessRestricted: false,
	});

	const createLocation = useCreateLocation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const result = await createLocation.mutateAsync({
			code: formData.code,
			name: formData.name,
			description: formData.description || undefined,
			parentId: formData.parentId || undefined,
			capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
			aisle: formData.aisle || undefined,
			bay: formData.bay || undefined,
			shelfNumber: formData.shelfNumber || undefined,
			position: formData.position || undefined,
			climateControlled: formData.climateControlled,
			fireSuppression: formData.fireSuppression,
			accessRestricted: formData.accessRestricted,
		});

		onCreated(result);
	};

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
					<h2 className={styles.title}>New Location</h2>
					<button className={styles.closeBtn} onClick={onClose}>×</button>
				</div>

				<form onSubmit={handleSubmit} className={styles.form}>
					{/* Code */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>
							Location Code <span className={styles.required}>*</span>
						</label>
						<input
							type="text"
							value={formData.code}
							onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
							placeholder="e.g., WH-A, SHELF-01"
							className={styles.input}
							required
						/>
						<span className={styles.hint}>Unique identifier for this location</span>
					</div>

					{/* Name */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>
							Name <span className={styles.required}>*</span>
						</label>
						<input
							type="text"
							value={formData.name}
							onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
							placeholder="e.g., Warehouse A, Shelf 1"
							className={styles.input}
							required
						/>
					</div>

					{/* Parent Location */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Parent Location</label>
						<select
							value={formData.parentId}
							onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
							className={styles.select}
						>
							<option value="">None (Top Level)</option>
							{locations.map((loc) => (
								<option key={loc.id} value={loc.id}>
									{loc.path} - {loc.name}
								</option>
							))}
						</select>
					</div>

					{/* Capacity */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Capacity</label>
						<input
							type="number"
							value={formData.capacity}
							onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
							placeholder="Max containers"
							className={styles.input}
						/>
						<span className={styles.hint}>Maximum number of containers this location can hold</span>
					</div>

					{/* Description */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Description</label>
						<textarea
							value={formData.description}
							onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
							placeholder="Optional description..."
							className={styles.textarea}
							rows={2}
						/>
					</div>

					{/* Physical Address */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Physical Address</label>
						<div className={styles.addressGrid}>
							<input
								type="text"
								value={formData.aisle}
								onChange={(e) => setFormData((prev) => ({ ...prev, aisle: e.target.value }))}
								placeholder="Aisle"
								className={styles.input}
							/>
							<input
								type="text"
								value={formData.bay}
								onChange={(e) => setFormData((prev) => ({ ...prev, bay: e.target.value }))}
								placeholder="Bay"
								className={styles.input}
							/>
							<input
								type="text"
								value={formData.shelfNumber}
								onChange={(e) => setFormData((prev) => ({ ...prev, shelfNumber: e.target.value }))}
								placeholder="Shelf"
								className={styles.input}
							/>
							<input
								type="text"
								value={formData.position}
								onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
								placeholder="Position"
								className={styles.input}
							/>
						</div>
					</div>

					{/* Features */}
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Features</label>
						<div className={styles.checkboxGroup}>
							<label className={styles.checkbox}>
								<input
									type="checkbox"
									checked={formData.climateControlled}
									onChange={(e) => setFormData((prev) => ({ ...prev, climateControlled: e.target.checked }))}
								/>
								<span>❄ Climate Controlled</span>
							</label>
							<label className={styles.checkbox}>
								<input
									type="checkbox"
									checked={formData.fireSuppression}
									onChange={(e) => setFormData((prev) => ({ ...prev, fireSuppression: e.target.checked }))}
								/>
								<span>🔥 Fire Suppression</span>
							</label>
							<label className={styles.checkbox}>
								<input
									type="checkbox"
									checked={formData.accessRestricted}
									onChange={(e) => setFormData((prev) => ({ ...prev, accessRestricted: e.target.checked }))}
								/>
								<span>🔒 Access Restricted</span>
							</label>
						</div>
					</div>

					{/* Actions */}
					<div className={styles.actions}>
						<button type="button" className={styles.cancelBtn} onClick={onClose}>
							Cancel
						</button>
						<button
							type="submit"
							className={styles.submitBtn}
							disabled={!formData.code || !formData.name || createLocation.isPending}
						>
							{createLocation.isPending ? 'Creating...' : 'Create Location'}
						</button>
					</div>
				</form>
			</motion.div>
		</motion.div>
	);
}

export default CreateLocationModal;
