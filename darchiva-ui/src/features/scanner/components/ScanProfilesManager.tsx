// Scan Profiles Manager - CRUD for Scan Presets
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TechPanel, TechButton, GridOverlay } from './core/TechPanel';
import { useScanProfiles, useCreateScanProfile, useUpdateScanProfile, useDeleteScanProfile } from '../api/hooks';
import type { ScanProfile, ScanOptions, ScanProfileCreate } from '../types';
import { DEFAULT_SCAN_OPTIONS } from '../types';
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	StarIcon,
	XMarkIcon,
	DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

interface ScanProfilesManagerProps {
	onProfileSelect?: (profile: ScanProfile) => void;
	className?: string;
}

export function ScanProfilesManager({ onProfileSelect, className }: ScanProfilesManagerProps) {
	const [editingProfile, setEditingProfile] = useState<ScanProfile | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const { data: profiles, isLoading } = useScanProfiles();
	const createMutation = useCreateScanProfile();
	const updateMutation = useUpdateScanProfile();
	const deleteMutation = useDeleteScanProfile();

	const handleCreate = () => {
		setEditingProfile(null);
		setIsCreating(true);
	};

	const handleEdit = (profile: ScanProfile) => {
		setEditingProfile(profile);
		setIsCreating(false);
	};

	const handleClose = () => {
		setEditingProfile(null);
		setIsCreating(false);
	};

	const handleDelete = (id: string) => {
		if (confirm('Delete this profile?')) {
			deleteMutation.mutate(id);
		}
	};

	return (
		<div className={cn('relative min-h-screen', className)}>
			<GridOverlay className="fixed" />

			<div className="relative z-10 p-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-[var(--scan-text-bright)]">
							Scan Profiles
						</h1>
						<p className="text-sm text-[var(--scan-text-muted)] font-mono">
							// SAVED SCAN PRESETS
						</p>
					</div>
					<TechButton variant="primary" onClick={handleCreate}>
						<PlusIcon className="w-4 h-4" />
						New Profile
					</TechButton>
				</div>

				{/* Profiles Grid */}
				{isLoading ? (
					<div className="text-center py-12">
						<div className="scan-activity w-48 mx-auto mb-4">
							<div className="scan-activity-wave" />
						</div>
						<span className="font-mono text-xs text-[var(--scan-text-muted)] uppercase">
							Loading profiles...
						</span>
					</div>
				) : profiles && profiles.length > 0 ? (
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 scan-stagger">
						{profiles.map((profile) => (
							<ProfileCard
								key={profile.id}
								profile={profile}
								onEdit={() => handleEdit(profile)}
								onDelete={() => handleDelete(profile.id)}
								onSelect={() => onProfileSelect?.(profile)}
							/>
						))}
					</div>
				) : (
					<div className="text-center py-12 text-[var(--scan-text-muted)]">
						<DocumentDuplicateIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
						<p className="text-sm">No profiles configured</p>
						<p className="text-xs mt-1">Create a profile to save your scan settings</p>
					</div>
				)}
			</div>

			{/* Edit/Create Dialog */}
			{(isCreating || editingProfile) && (
				<ProfileEditor
					profile={editingProfile}
					onClose={handleClose}
					onSave={async (data) => {
						if (editingProfile) {
							await updateMutation.mutateAsync({ id: editingProfile.id, data });
						} else {
							await createMutation.mutateAsync(data as ScanProfileCreate);
						}
						handleClose();
					}}
					isSaving={createMutation.isPending || updateMutation.isPending}
				/>
			)}
		</div>
	);
}

interface ProfileCardProps {
	profile: ScanProfile;
	onEdit: () => void;
	onDelete: () => void;
	onSelect: () => void;
}

function ProfileCard({ profile, onEdit, onDelete, onSelect }: ProfileCardProps) {
	return (
		<div
			className={cn(
				'scan-panel p-4 cursor-pointer transition-all',
				'hover:border-[var(--scan-border-active)]',
				profile.is_default && 'border-amber-500/30'
			)}
			onClick={onSelect}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2">
					<h3 className="font-medium text-[var(--scan-text-primary)]">{profile.name}</h3>
					{profile.is_default && <StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />}
				</div>
				<div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
					<button
						onClick={onEdit}
						className="p-1 rounded hover:bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-muted)] hover:text-[var(--scan-text-primary)]"
					>
						<PencilIcon className="w-4 h-4" />
					</button>
					<button
						onClick={onDelete}
						className="p-1 rounded hover:bg-red-500/10 text-[var(--scan-text-muted)] hover:text-red-400"
					>
						<TrashIcon className="w-4 h-4" />
					</button>
				</div>
			</div>

			{profile.description && (
				<p className="text-xs text-[var(--scan-text-muted)] mb-3">{profile.description}</p>
			)}

			<div className="flex flex-wrap gap-1">
				<OptionBadge label={`${profile.options.resolution} DPI`} />
				<OptionBadge label={profile.options.color_mode} />
				<OptionBadge label={profile.options.format} />
				<OptionBadge label={profile.options.input_source} />
				{profile.options.duplex && <OptionBadge label="Duplex" />}
			</div>
		</div>
	);
}

function OptionBadge({ label }: { label: string }) {
	return (
		<span className="px-2 py-0.5 rounded bg-[var(--scan-bg-tertiary)] text-[10px] font-mono uppercase text-[var(--scan-text-secondary)]">
			{label}
		</span>
	);
}

interface ProfileEditorProps {
	profile: ScanProfile | null;
	onClose: () => void;
	onSave: (data: Partial<ScanProfileCreate>) => Promise<void>;
	isSaving: boolean;
}

function ProfileEditor({ profile, onClose, onSave, isSaving }: ProfileEditorProps) {
	const [name, setName] = useState(profile?.name || '');
	const [description, setDescription] = useState(profile?.description || '');
	const [isDefault, setIsDefault] = useState(profile?.is_default || false);
	const [options, setOptions] = useState<ScanOptions>(profile?.options || { ...DEFAULT_SCAN_OPTIONS });

	const updateOption = <K extends keyof ScanOptions>(key: K, value: ScanOptions[K]) => {
		setOptions((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSave({ name, description, is_default: isDefault, options });
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="scan-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="scan-panel-header">
					<span>{profile ? 'Edit Profile' : 'New Profile'}</span>
					<button onClick={onClose} className="p-1 hover:bg-[var(--scan-bg-tertiary)] rounded">
						<XMarkIcon className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Basic Info */}
					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
								Profile Name *
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								className={cn(
									'w-full px-4 py-2 rounded',
									'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
									'text-[var(--scan-text-primary)]',
									'focus:outline-none focus:border-[var(--scan-accent)]'
								)}
								placeholder="e.g., High Quality Color"
							/>
						</div>
						<div className="flex items-end">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={isDefault}
									onChange={(e) => setIsDefault(e.target.checked)}
									className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
								/>
								<span className="text-sm text-[var(--scan-text-secondary)]">Set as default</span>
							</label>
						</div>
					</div>

					<div>
						<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
							Description
						</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							className={cn(
								'w-full px-4 py-2 rounded resize-none',
								'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
								'text-[var(--scan-text-primary)]',
								'focus:outline-none focus:border-[var(--scan-accent)]'
							)}
							placeholder="Optional description..."
						/>
					</div>

					{/* Scan Options */}
					<div className="space-y-4 pt-4 border-t border-[var(--scan-border)]">
						<h4 className="font-mono text-xs text-[var(--scan-text-muted)] uppercase">Scan Options</h4>

						<div className="grid sm:grid-cols-2 gap-4">
							{/* Resolution */}
							<div>
								<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
									Resolution
								</label>
								<select
									value={options.resolution}
									onChange={(e) => updateOption('resolution', parseInt(e.target.value))}
									className={cn(
										'w-full px-3 py-2 rounded',
										'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
										'text-[var(--scan-text-primary)] font-mono text-sm'
									)}
								>
									{[75, 100, 150, 200, 300, 400, 600, 1200].map((res) => (
										<option key={res} value={res}>{res} DPI</option>
									))}
								</select>
							</div>

							{/* Color Mode */}
							<div>
								<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
									Color Mode
								</label>
								<select
									value={options.color_mode}
									onChange={(e) => updateOption('color_mode', e.target.value as any)}
									className={cn(
										'w-full px-3 py-2 rounded',
										'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
										'text-[var(--scan-text-primary)] font-mono text-sm'
									)}
								>
									<option value="color">Color</option>
									<option value="grayscale">Grayscale</option>
									<option value="monochrome">Monochrome</option>
								</select>
							</div>

							{/* Source */}
							<div>
								<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
									Input Source
								</label>
								<select
									value={options.input_source}
									onChange={(e) => updateOption('input_source', e.target.value as any)}
									className={cn(
										'w-full px-3 py-2 rounded',
										'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
										'text-[var(--scan-text-primary)] font-mono text-sm'
									)}
								>
									<option value="platen">Platen (Flatbed)</option>
									<option value="adf">ADF (Feeder)</option>
									<option value="adf_duplex">ADF Duplex</option>
								</select>
							</div>

							{/* Format */}
							<div>
								<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
									Output Format
								</label>
								<select
									value={options.format}
									onChange={(e) => updateOption('format', e.target.value as any)}
									className={cn(
										'w-full px-3 py-2 rounded',
										'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
										'text-[var(--scan-text-primary)] font-mono text-sm'
									)}
								>
									<option value="jpeg">JPEG</option>
									<option value="png">PNG</option>
									<option value="tiff">TIFF</option>
									<option value="pdf">PDF</option>
								</select>
							</div>

							{/* Quality */}
							<div>
								<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
									Quality: {options.quality}%
								</label>
								<input
									type="range"
									min="1"
									max="100"
									value={options.quality}
									onChange={(e) => updateOption('quality', parseInt(e.target.value))}
									className="w-full accent-[var(--scan-accent)]"
								/>
							</div>

							{/* Max Pages */}
							<div>
								<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
									Max Pages (batch)
								</label>
								<input
									type="number"
									value={options.max_pages || ''}
									onChange={(e) => updateOption('max_pages', e.target.value ? parseInt(e.target.value) : null)}
									className={cn(
										'w-full px-3 py-2 rounded',
										'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
										'text-[var(--scan-text-primary)] font-mono text-sm'
									)}
									placeholder="Unlimited"
								/>
							</div>
						</div>

						{/* Toggles */}
						<div className="flex flex-wrap gap-4">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={options.duplex}
									onChange={(e) => updateOption('duplex', e.target.checked)}
									className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
								/>
								<span className="text-sm text-[var(--scan-text-secondary)]">Duplex</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={options.auto_crop}
									onChange={(e) => updateOption('auto_crop', e.target.checked)}
									className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
								/>
								<span className="text-sm text-[var(--scan-text-secondary)]">Auto Crop</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={options.auto_deskew}
									onChange={(e) => updateOption('auto_deskew', e.target.checked)}
									className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
								/>
								<span className="text-sm text-[var(--scan-text-secondary)]">Auto Deskew</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={options.blank_page_removal}
									onChange={(e) => updateOption('blank_page_removal', e.target.checked)}
									className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
								/>
								<span className="text-sm text-[var(--scan-text-secondary)]">Remove Blank Pages</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={options.batch_mode}
									onChange={(e) => updateOption('batch_mode', e.target.checked)}
									className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
								/>
								<span className="text-sm text-[var(--scan-text-secondary)]">Batch Mode</span>
							</label>
						</div>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-4 border-t border-[var(--scan-border)]">
						<TechButton onClick={onClose}>
							Cancel
						</TechButton>
						<TechButton variant="primary" loading={isSaving}>
							{profile ? 'Save Changes' : 'Create Profile'}
						</TechButton>
					</div>
				</form>
			</div>
		</div>
	);
}
