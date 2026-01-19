// (c) Copyright Datacraft, 2026
import { useState, useRef } from 'react';
import type { TenantBranding, BrandingUpdate } from '../types';
import styles from '../tenants.module.css';

interface TenantBrandingEditorProps {
	branding?: TenantBranding;
	onSave: (data: BrandingUpdate) => Promise<void>;
}

export function TenantBrandingEditor({ branding, onSave }: TenantBrandingEditorProps) {
	const [formData, setFormData] = useState<BrandingUpdate>({
		logo_url: branding?.logo_url || '',
		logo_dark_url: branding?.logo_dark_url || '',
		primary_color: branding?.primary_color || '#C75B39',
		secondary_color: branding?.secondary_color || '#D4A853',
		login_background_url: branding?.login_background_url || '',
		login_message: branding?.login_message || '',
	});
	const [saving, setSaving] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSave = async () => {
		setSaving(true);
		try {
			await onSave(formData);
		} finally {
			setSaving(false);
		}
	};

	const handleFileUpload = (field: 'logo_url' | 'logo_dark_url' | 'login_background_url') => {
		// In a real implementation, this would upload to storage and return a URL
		// For now, we'll just show how the UI would work
		fileInputRef.current?.click();
	};

	return (
		<div>
			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Logo</h3>
				<div className={styles.logoUpload}>
					<div className={styles.logoPreview}>
						{formData.logo_url ? (
							<img src={formData.logo_url} alt="Logo" />
						) : (
							<div className={styles.logoPlaceholder}>
								<svg
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<polyline points="21 15 16 10 5 21" />
								</svg>
							</div>
						)}
					</div>
					<div>
						<p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--ink)' }}>
							Organization Logo
						</p>
						<p
							style={{
								margin: '0 0 1rem',
								fontSize: '0.8rem',
								color: 'var(--ink-muted)',
							}}
						>
							Recommended size: 200×60px, PNG or SVG
						</p>
						<button
							className={styles.uploadButton}
							onClick={() => handleFileUpload('logo_url')}
						>
							Upload Logo
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							style={{ display: 'none' }}
						/>
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Brand Colors</h3>
				<div className={styles.colorPickers}>
					<div className={styles.colorPicker}>
						<input
							type="color"
							className={styles.colorSwatch}
							value={formData.primary_color}
							onChange={(e) =>
								setFormData({ ...formData, primary_color: e.target.value })
							}
						/>
						<div>
							<label className={styles.formLabel}>Primary Color</label>
							<input
								type="text"
								className={`${styles.formInput} ${styles.colorInput}`}
								value={formData.primary_color}
								onChange={(e) =>
									setFormData({ ...formData, primary_color: e.target.value })
								}
							/>
						</div>
					</div>

					<div className={styles.colorPicker}>
						<input
							type="color"
							className={styles.colorSwatch}
							value={formData.secondary_color}
							onChange={(e) =>
								setFormData({ ...formData, secondary_color: e.target.value })
							}
						/>
						<div>
							<label className={styles.formLabel}>Secondary Color</label>
							<input
								type="text"
								className={`${styles.formInput} ${styles.colorInput}`}
								value={formData.secondary_color}
								onChange={(e) =>
									setFormData({ ...formData, secondary_color: e.target.value })
								}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Login Page</h3>
				<div className={styles.formGrid}>
					<div className={styles.formGroupFull}>
						<label className={styles.formLabel}>Login Message</label>
						<textarea
							className={styles.formInput}
							rows={3}
							value={formData.login_message}
							onChange={(e) =>
								setFormData({ ...formData, login_message: e.target.value })
							}
							placeholder="Welcome message shown on the login page..."
							style={{ resize: 'vertical' }}
						/>
					</div>
				</div>

				<div className={styles.logoUpload} style={{ marginTop: '1rem' }}>
					<div className={styles.logoPreview} style={{ width: '120px', height: '80px' }}>
						{formData.login_background_url ? (
							<img src={formData.login_background_url} alt="Background" />
						) : (
							<div className={styles.logoPlaceholder}>
								<svg
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
								>
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<polyline points="21 15 16 10 5 21" />
								</svg>
							</div>
						)}
					</div>
					<div>
						<p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--ink)' }}>
							Login Background Image
						</p>
						<p
							style={{
								margin: '0 0 1rem',
								fontSize: '0.8rem',
								color: 'var(--ink-muted)',
							}}
						>
							Recommended size: 1920×1080px
						</p>
						<button
							className={styles.uploadButton}
							onClick={() => handleFileUpload('login_background_url')}
						>
							Upload Background
						</button>
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Preview</h3>
				<div
					style={{
						padding: '2rem',
						background: `linear-gradient(135deg, ${formData.primary_color}20 0%, ${formData.secondary_color}20 100%)`,
						borderRadius: '8px',
						border: '1px solid var(--cream-dark)',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '1rem',
							marginBottom: '1rem',
						}}
					>
						<div
							style={{
								width: '48px',
								height: '48px',
								borderRadius: '8px',
								background: formData.primary_color,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'white',
								fontWeight: 600,
							}}
						>
							{formData.logo_url ? (
								<img
									src={formData.logo_url}
									alt=""
									style={{ maxWidth: '100%', maxHeight: '100%' }}
								/>
							) : (
								'DA'
							)}
						</div>
						<span
							style={{
								fontFamily: "'Newsreader', serif",
								fontSize: '1.25rem',
								color: formData.primary_color,
							}}
						>
							Your Organization
						</span>
					</div>
					<button
						style={{
							padding: '0.625rem 1.25rem',
							background: formData.primary_color,
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							fontFamily: "'DM Sans', sans-serif",
							cursor: 'pointer',
						}}
					>
						Sample Button
					</button>
					<span
						style={{
							marginLeft: '0.75rem',
							padding: '0.625rem 1.25rem',
							background: formData.secondary_color,
							color: 'white',
							borderRadius: '6px',
							fontFamily: "'DM Sans', sans-serif",
						}}
					>
						Accent
					</span>
				</div>
			</div>

			<div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
				<button className={styles.primaryButton} onClick={handleSave} disabled={saving}>
					{saving ? 'Saving...' : 'Save Branding'}
				</button>
			</div>
		</div>
	);
}
