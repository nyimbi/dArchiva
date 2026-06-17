// (c) Copyright Datacraft, 2026
/**
 * BrandingSettings — admin card for custom logo and accent colour.
 * Wiring agent connects this to the settings page.
 */
import { useEffect, useRef, useState } from 'react';
import { useTenantSettings, useUpdateTenantSettings, useUploadLogo } from './api';
import type { BrandingUpdate } from '../tenants/types';

// ─── Preset palette (12 colours) ───────────────────────────────────────────────

const PRESET_COLORS = [
	'#228be6', // dArchiva default blue
	'#C75B39', // terracotta
	'#D4A853', // amber
	'#2f9e44', // forest green
	'#e64980', // rose
	'#7950f2', // violet
	'#f76707', // orange
	'#1098ad', // cyan
	'#212529', // near-black
	'#495057', // charcoal
	'#a61e4d', // crimson
	'#5c7cfa', // cornflower
] as const;

const COMMON_TIMEZONES = [
	'UTC',
	'Africa/Nairobi',
	'Africa/Lagos',
	'Africa/Johannesburg',
	'Africa/Cairo',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles',
	'Europe/London',
	'Europe/Paris',
	'Europe/Berlin',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Singapore',
	'Asia/Tokyo',
	'Australia/Sydney',
];

const DATE_FORMATS = [
	{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
	{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
	{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
];

// ─── Inline style tokens (consistent with dArchiva command-centre aesthetic) ──

const s = {
	card: {
		background: '#12151c',
		border: '1px solid #2a303c',
		borderRadius: '8px',
		padding: '1.75rem',
		fontFamily: "'DM Sans', sans-serif",
	} as React.CSSProperties,
	cardTitle: {
		fontFamily: "'IBM Plex Mono', monospace",
		fontSize: '0.7rem',
		fontWeight: 600,
		letterSpacing: '0.1em',
		textTransform: 'uppercase' as const,
		color: '#5a6270',
		margin: '0 0 1.5rem',
	} as React.CSSProperties,
	section: {
		marginBottom: '1.75rem',
		paddingBottom: '1.75rem',
		borderBottom: '1px solid #2a303c',
	} as React.CSSProperties,
	sectionLast: {
		marginBottom: '1.75rem',
	} as React.CSSProperties,
	sectionTitle: {
		fontSize: '0.85rem',
		fontWeight: 600,
		color: '#f0e6d3',
		margin: '0 0 1rem',
	} as React.CSSProperties,
	label: {
		display: 'block',
		fontFamily: "'IBM Plex Mono', monospace",
		fontSize: '0.65rem',
		fontWeight: 500,
		letterSpacing: '0.08em',
		textTransform: 'uppercase' as const,
		color: '#5a6270',
		marginBottom: '0.4rem',
	} as React.CSSProperties,
	input: {
		width: '100%',
		padding: '0.5rem 0.75rem',
		background: '#0a0c10',
		border: '1px solid #2a303c',
		borderRadius: '4px',
		color: '#f0e6d3',
		fontSize: '0.875rem',
		fontFamily: "'DM Sans', sans-serif",
		boxSizing: 'border-box' as const,
		outline: 'none',
	} as React.CSSProperties,
	select: {
		width: '100%',
		padding: '0.5rem 0.75rem',
		background: '#0a0c10',
		border: '1px solid #2a303c',
		borderRadius: '4px',
		color: '#f0e6d3',
		fontSize: '0.875rem',
		fontFamily: "'DM Sans', sans-serif",
		boxSizing: 'border-box' as const,
		outline: 'none',
		cursor: 'pointer',
	} as React.CSSProperties,
	grid2: {
		display: 'grid',
		gridTemplateColumns: '1fr 1fr',
		gap: '1rem',
	} as React.CSSProperties,
	grid1: {
		display: 'grid',
		gridTemplateColumns: '1fr',
		gap: '1rem',
	} as React.CSSProperties,
	formGroup: {
		display: 'flex',
		flexDirection: 'column' as const,
	} as React.CSSProperties,
	hint: {
		fontSize: '0.75rem',
		color: '#5a6270',
		margin: '0.3rem 0 0',
	} as React.CSSProperties,
	// Logo section
	logoRow: {
		display: 'flex',
		gap: '1.25rem',
		alignItems: 'flex-start',
	} as React.CSSProperties,
	logoBox: {
		width: '96px',
		height: '56px',
		flexShrink: 0,
		background: '#0a0c10',
		border: '1px solid #2a303c',
		borderRadius: '6px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	} as React.CSSProperties,
	logoPlaceholder: {
		color: '#3a4250',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
	} as React.CSSProperties,
	uploadBtn: {
		padding: '0.4rem 0.875rem',
		background: 'rgba(201,162,39,0.12)',
		border: '1px solid rgba(201,162,39,0.35)',
		borderRadius: '4px',
		color: '#c9a227',
		fontFamily: "'IBM Plex Mono', monospace",
		fontSize: '0.7rem',
		fontWeight: 600,
		letterSpacing: '0.05em',
		cursor: 'pointer',
		marginRight: '0.5rem',
		transition: 'all 0.2s',
	} as React.CSSProperties,
	removeBtn: {
		padding: '0.4rem 0.875rem',
		background: 'rgba(248,113,113,0.1)',
		border: '1px solid rgba(248,113,113,0.3)',
		borderRadius: '4px',
		color: '#f87171',
		fontFamily: "'IBM Plex Mono', monospace",
		fontSize: '0.7rem',
		fontWeight: 600,
		letterSpacing: '0.05em',
		cursor: 'pointer',
		transition: 'all 0.2s',
	} as React.CSSProperties,
	// Color palette
	swatchGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(6, 1fr)',
		gap: '0.5rem',
		marginBottom: '0.75rem',
	} as React.CSSProperties,
	swatchRow: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
	} as React.CSSProperties,
	colorHexInput: {
		flex: 1,
		padding: '0.5rem 0.75rem',
		background: '#0a0c10',
		border: '1px solid #2a303c',
		borderRadius: '4px',
		color: '#f0e6d3',
		fontSize: '0.875rem',
		fontFamily: "'IBM Plex Mono', monospace",
		outline: 'none',
	} as React.CSSProperties,
	// Preview
	previewCard: {
		background: '#0a0c10',
		border: '1px solid #2a303c',
		borderRadius: '6px',
		overflow: 'hidden',
	} as React.CSSProperties,
	previewSidebar: {
		width: '140px',
		padding: '1rem 0.875rem',
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.5rem',
	} as React.CSSProperties,
	previewLogoArea: {
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		paddingBottom: '0.75rem',
		marginBottom: '0.5rem',
		borderBottom: '1px solid rgba(255,255,255,0.08)',
	} as React.CSSProperties,
	previewNavItem: {
		padding: '0.4rem 0.5rem',
		borderRadius: '4px',
		fontSize: '0.7rem',
		color: '#8a9099',
		fontFamily: "'IBM Plex Mono', monospace",
	} as React.CSSProperties,
	// Save button
	saveBtn: {
		padding: '0.625rem 1.5rem',
		border: 'none',
		borderRadius: '4px',
		fontFamily: "'IBM Plex Mono', monospace",
		fontSize: '0.75rem',
		fontWeight: 600,
		letterSpacing: '0.05em',
		cursor: 'pointer',
		transition: 'all 0.2s',
	} as React.CSSProperties,
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function BrandingSettings() {
	const { data: branding, isLoading } = useTenantSettings();
	const updateMutation = useUpdateTenantSettings();
	const uploadMutation = useUploadLogo();

	const fileInputRef = useRef<HTMLInputElement>(null);

	const [form, setForm] = useState<BrandingUpdate & { timezone: string; date_format: string; org_name: string; support_email: string }>({
		logo_url: '',
		primary_color: '#228be6',
		secondary_color: '#868e96',
		login_message: '',
		timezone: 'UTC',
		date_format: 'YYYY-MM-DD',
		org_name: '',
		support_email: '',
	});

	// Populate once branding loads
	useEffect(() => {
		if (branding) {
			setForm((prev) => ({
				...prev,
				logo_url: branding.logo_url ?? '',
				primary_color: branding.primary_color ?? '#228be6',
				secondary_color: branding.secondary_color ?? '#868e96',
				login_message: branding.login_message ?? '',
			}));
		}
	}, [branding]);

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const { logo_url } = await uploadMutation.mutateAsync(file);
			setForm((prev) => ({ ...prev, logo_url }));
		} catch {
			// error surfaced via mutation state
		}
		// reset so same file can be re-selected
		e.target.value = '';
	};

	const handleSave = async () => {
		const { timezone: _tz, date_format: _df, org_name: _on, support_email: _se, ...brandingFields } = form;
		await updateMutation.mutateAsync(brandingFields);
	};

	const saving = updateMutation.isPending;
	const uploading = uploadMutation.isPending;

	if (isLoading) {
		return (
			<div style={s.card}>
				<p style={{ color: '#5a6270', fontSize: '0.875rem' }}>Loading branding…</p>
			</div>
		);
	}

	return (
		<div style={s.card}>
			<p style={s.cardTitle}>Branding</p>

			{/* ── Organization ── */}
			<div style={s.section}>
				<p style={s.sectionTitle}>Organization</p>
				<div style={s.grid2}>
					<div style={s.formGroup}>
						<label style={s.label}>Organization Name</label>
						<input
							style={s.input}
							type="text"
							value={form.org_name}
							onChange={(e) => setForm((p) => ({ ...p, org_name: e.target.value }))}
							placeholder="Acme Corp"
						/>
					</div>
					<div style={s.formGroup}>
						<label style={s.label}>Support Email</label>
						<input
							style={s.input}
							type="email"
							value={form.support_email}
							onChange={(e) => setForm((p) => ({ ...p, support_email: e.target.value }))}
							placeholder="support@example.com"
						/>
					</div>
					<div style={s.formGroup}>
						<label style={s.label}>Timezone</label>
						<select
							style={s.select}
							value={form.timezone}
							onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
						>
							{COMMON_TIMEZONES.map((tz) => (
								<option key={tz} value={tz}>{tz}</option>
							))}
						</select>
					</div>
					<div style={s.formGroup}>
						<label style={s.label}>Date Format</label>
						<select
							style={s.select}
							value={form.date_format}
							onChange={(e) => setForm((p) => ({ ...p, date_format: e.target.value }))}
						>
							{DATE_FORMATS.map((df) => (
								<option key={df.value} value={df.value}>{df.label}</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* ── Logo ── */}
			<div style={s.section}>
				<p style={s.sectionTitle}>Logo</p>
				<div style={s.logoRow}>
					<div style={s.logoBox}>
						{form.logo_url ? (
							<img
								src={form.logo_url}
								alt="Organization logo"
								style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
							/>
						) : (
							<div style={s.logoPlaceholder}>
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
									<rect x="3" y="3" width="18" height="18" rx="2" />
									<circle cx="8.5" cy="8.5" r="1.5" />
									<polyline points="21 15 16 10 5 21" />
								</svg>
							</div>
						)}
					</div>
					<div>
						<p style={{ margin: '0 0 0.375rem', fontSize: '0.875rem', color: '#8a9099' }}>
							Organization Logo
						</p>
						<p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#5a6270' }}>
							Recommended: 200×60 px · PNG or SVG
						</p>
						<button
							style={s.uploadBtn}
							onClick={() => fileInputRef.current?.click()}
							disabled={uploading}
						>
							{uploading ? 'Uploading…' : 'Upload Logo'}
						</button>
						{form.logo_url && (
							<button
								style={s.removeBtn}
								onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
							>
								Remove
							</button>
						)}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png,image/svg+xml,image/jpeg,image/webp"
							style={{ display: 'none' }}
							onChange={handleFileChange}
						/>
					</div>
				</div>
			</div>

			{/* ── Primary color ── */}
			<div style={s.section}>
				<p style={s.sectionTitle}>Accent Color</p>
				<div style={s.swatchGrid}>
					{PRESET_COLORS.map((color) => (
						<button
							key={color}
							title={color}
							onClick={() => setForm((p) => ({ ...p, primary_color: color }))}
							style={{
								width: '100%',
								aspectRatio: '1',
								borderRadius: '4px',
								background: color,
								border: form.primary_color === color
									? '2px solid #f0e6d3'
									: '2px solid transparent',
								cursor: 'pointer',
								padding: 0,
								outline: 'none',
							}}
						/>
					))}
				</div>
				<div style={s.swatchRow}>
					<input
						type="color"
						value={form.primary_color}
						onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
						style={{
							width: '36px',
							height: '36px',
							padding: 0,
							border: '1px solid #2a303c',
							borderRadius: '4px',
							background: 'none',
							cursor: 'pointer',
							flexShrink: 0,
						}}
					/>
					<input
						type="text"
						value={form.primary_color}
						onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
						placeholder="#228be6"
						maxLength={7}
						style={s.colorHexInput}
					/>
				</div>
				<p style={{ ...s.hint, marginTop: '0.5rem' }}>
					Applied as <code style={{ fontFamily: 'inherit', opacity: 0.8 }}>--brand-primary</code> CSS custom property across the app.
				</p>
			</div>

			{/* ── Preview ── */}
			<div style={s.section}>
				<p style={s.sectionTitle}>Preview</p>
				<div style={{ display: 'flex', ...s.previewCard }}>
					{/* Simulated sidebar */}
					<div style={{ ...s.previewSidebar, background: '#0a0c10', borderRight: '1px solid #2a303c' }}>
						<div style={s.previewLogoArea}>
							{form.logo_url ? (
								<img
									src={form.logo_url}
									alt=""
									style={{ height: '24px', objectFit: 'contain' }}
								/>
							) : (
								<div
									style={{
										width: '24px',
										height: '24px',
										borderRadius: '4px',
										background: form.primary_color,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: '#fff',
										fontSize: '0.6rem',
										fontWeight: 700,
										fontFamily: "'IBM Plex Mono', monospace",
										flexShrink: 0,
									}}
								>
									DA
								</div>
							)}
							<span style={{ fontSize: '0.75rem', color: '#f0e6d3', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
								{form.org_name || 'dArchiva'}
							</span>
						</div>
						{['Documents', 'Projects', 'Search', 'Settings'].map((item) => (
							<div key={item} style={s.previewNavItem}>{item}</div>
						))}
					</div>
					{/* Simulated content area */}
					<div style={{ flex: 1, padding: '1rem' }}>
						<div
							style={{
								display: 'inline-block',
								padding: '0.4rem 1rem',
								background: form.primary_color,
								color: '#fff',
								borderRadius: '4px',
								fontSize: '0.75rem',
								fontFamily: "'IBM Plex Mono', monospace",
								fontWeight: 600,
								marginBottom: '0.75rem',
							}}
						>
							Primary Button
						</div>
						<div
							style={{
								height: '6px',
								background: form.primary_color,
								borderRadius: '3px',
								opacity: 0.3,
								marginBottom: '0.5rem',
							}}
						/>
						<div
							style={{
								height: '4px',
								background: '#2a303c',
								borderRadius: '3px',
								width: '70%',
								marginBottom: '0.5rem',
							}}
						/>
						<div
							style={{
								height: '4px',
								background: '#2a303c',
								borderRadius: '3px',
								width: '50%',
							}}
						/>
					</div>
				</div>
			</div>

			{/* ── Login message ── */}
			<div style={s.sectionLast}>
				<p style={s.sectionTitle}>Login Page Message</p>
				<textarea
					value={form.login_message ?? ''}
					onChange={(e) => setForm((p) => ({ ...p, login_message: e.target.value }))}
					placeholder="Optional welcome message shown on the login screen…"
					rows={3}
					style={{
						...s.input,
						resize: 'vertical',
						lineHeight: 1.5,
					}}
				/>
			</div>

			{/* ── Actions ── */}
			<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
				<button
					style={{
						...s.saveBtn,
						background: saving ? '#2a303c' : form.primary_color,
						color: '#fff',
						opacity: saving ? 0.6 : 1,
					}}
					onClick={handleSave}
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Save Changes'}
				</button>
				{updateMutation.isSuccess && !saving && (
					<span style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: "'IBM Plex Mono', monospace" }}>
						Saved
					</span>
				)}
				{updateMutation.isError && (
					<span style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: "'IBM Plex Mono', monospace" }}>
						Save failed
					</span>
				)}
			</div>
		</div>
	);
}
