// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import type { TenantSettings, SettingsUpdate } from '../types';
import styles from '../tenants.module.css';

interface TenantSettingsEditorProps {
	settings?: TenantSettings;
	onSave: (data: SettingsUpdate) => Promise<void>;
}

interface FeatureToggle {
	key: keyof Pick<
		TenantSettings,
		'ocr_enabled' | 'ai_features_enabled' | 'workflow_enabled' | 'encryption_enabled'
	>;
	label: string;
	description: string;
}

const featureToggles: FeatureToggle[] = [
	{
		key: 'ocr_enabled',
		label: 'OCR Processing',
		description: 'Automatically extract text from scanned documents',
	},
	{
		key: 'ai_features_enabled',
		label: 'AI Features',
		description: 'Document classification, entity extraction, and smart suggestions',
	},
	{
		key: 'workflow_enabled',
		label: 'Workflows',
		description: 'Automated document routing and approval processes',
	},
	{
		key: 'encryption_enabled',
		label: 'End-to-End Encryption',
		description: 'Encrypt sensitive documents at rest with tenant-managed keys',
	},
];

const languageOptions = [
	{ value: 'en', label: 'English' },
	{ value: 'es', label: 'Spanish' },
	{ value: 'fr', label: 'French' },
	{ value: 'de', label: 'German' },
	{ value: 'pt', label: 'Portuguese' },
	{ value: 'it', label: 'Italian' },
	{ value: 'nl', label: 'Dutch' },
	{ value: 'ja', label: 'Japanese' },
	{ value: 'zh', label: 'Chinese' },
];

export function TenantSettingsEditor({ settings, onSave }: TenantSettingsEditorProps) {
	const [formData, setFormData] = useState<SettingsUpdate>({
		document_numbering_scheme: settings?.document_numbering_scheme || '{YEAR}-{SEQ:6}',
		default_language: settings?.default_language || 'en',
		storage_quota_gb: settings?.storage_quota_gb,
		warn_at_percentage: settings?.warn_at_percentage ?? 80,
		default_retention_days: settings?.default_retention_days,
		auto_archive_days: settings?.auto_archive_days,
		ocr_enabled: settings?.ocr_enabled ?? true,
		ai_features_enabled: settings?.ai_features_enabled ?? true,
		workflow_enabled: settings?.workflow_enabled ?? true,
		encryption_enabled: settings?.encryption_enabled ?? false,
	});
	const [saving, setSaving] = useState(false);

	const handleToggle = (key: FeatureToggle['key']) => {
		setFormData((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await onSave(formData);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div>
			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Features</h3>
				{featureToggles.map((toggle) => (
					<div key={toggle.key} className={styles.toggleRow}>
						<div className={styles.toggleInfo}>
							<h4>{toggle.label}</h4>
							<p>{toggle.description}</p>
						</div>
						<button
							type="button"
							className={`${styles.toggle} ${formData[toggle.key] ? styles.active : ''}`}
							onClick={() => handleToggle(toggle.key)}
							aria-pressed={formData[toggle.key]}
						/>
					</div>
				))}
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Document Settings</h3>
				<div className={styles.formGrid}>
					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Document Numbering Scheme</label>
						<input
							type="text"
							className={styles.formInput}
							value={formData.document_numbering_scheme}
							onChange={(e) =>
								setFormData({ ...formData, document_numbering_scheme: e.target.value })
							}
							placeholder="{YEAR}-{SEQ:6}"
						/>
						<p
							style={{
								margin: '0.375rem 0 0',
								fontSize: '0.75rem',
								color: 'var(--ink-muted)',
							}}
						>
							Available tokens: {'{YEAR}'}, {'{MONTH}'}, {'{DAY}'}, {'{SEQ:n}'}
						</p>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Default Language</label>
						<select
							className={styles.filterSelect}
							value={formData.default_language}
							onChange={(e) =>
								setFormData({ ...formData, default_language: e.target.value })
							}
							style={{ width: '100%' }}
						>
							{languageOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Storage & Retention</h3>
				<div className={styles.formGrid}>
					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Storage Quota (GB)</label>
						<input
							type="number"
							className={styles.formInput}
							value={formData.storage_quota_gb || ''}
							onChange={(e) =>
								setFormData({
									...formData,
									storage_quota_gb: e.target.value ? parseInt(e.target.value) : undefined,
								})
							}
							placeholder="Unlimited"
							min={1}
						/>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Warning Threshold (%)</label>
						<input
							type="number"
							className={styles.formInput}
							value={formData.warn_at_percentage ?? 80}
							onChange={(e) =>
								setFormData({
									...formData,
									warn_at_percentage: parseInt(e.target.value) || 80,
								})
							}
							min={50}
							max={95}
						/>
						<p
							style={{
								margin: '0.375rem 0 0',
								fontSize: '0.75rem',
								color: 'var(--ink-muted)',
							}}
						>
							Alert when storage reaches this percentage
						</p>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Default Retention (Days)</label>
						<input
							type="number"
							className={styles.formInput}
							value={formData.default_retention_days || ''}
							onChange={(e) =>
								setFormData({
									...formData,
									default_retention_days: e.target.value
										? parseInt(e.target.value)
										: undefined,
								})
							}
							placeholder="Indefinite"
							min={30}
						/>
					</div>

					<div className={styles.formGroup}>
						<label className={styles.formLabel}>Auto-Archive After (Days)</label>
						<input
							type="number"
							className={styles.formInput}
							value={formData.auto_archive_days || ''}
							onChange={(e) =>
								setFormData({
									...formData,
									auto_archive_days: e.target.value
										? parseInt(e.target.value)
										: undefined,
								})
							}
							placeholder="Disabled"
							min={30}
						/>
						<p
							style={{
								margin: '0.375rem 0 0',
								fontSize: '0.75rem',
								color: 'var(--ink-muted)',
							}}
						>
							Automatically archive inactive documents
						</p>
					</div>
				</div>
			</div>

			<div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
				<button className={styles.primaryButton} onClick={handleSave} disabled={saving}>
					{saving ? 'Saving...' : 'Save Settings'}
				</button>
			</div>
		</div>
	);
}
