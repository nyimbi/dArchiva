// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import type { TenantCreate, Plan, PlanFeatures } from '../types';
import { AVAILABLE_PLANS } from '../types';
import { createTenant } from '../api';
import styles from '../tenants.module.css';

interface TenantCreationWizardProps {
	onComplete: () => void;
	onCancel: () => void;
}

type Step = 'basic' | 'plan' | 'branding' | 'features';

const steps: { id: Step; label: string }[] = [
	{ id: 'basic', label: 'Basic Info' },
	{ id: 'plan', label: 'Plan' },
	{ id: 'branding', label: 'Branding' },
	{ id: 'features', label: 'Features' },
];

function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function TenantCreationWizard({ onComplete, onCancel }: TenantCreationWizardProps) {
	const [currentStep, setCurrentStep] = useState<Step>('basic');
	const [creating, setCreating] = useState(false);
	const [formData, setFormData] = useState<TenantCreate & { primary_color: string; secondary_color: string }>({
		name: '',
		slug: '',
		plan: 'professional',
		contact_email: '',
		contact_phone: '',
		billing_email: '',
		max_users: 25,
		max_storage_gb: 100,
		features: {
			ocr_enabled: true,
			ai_features_enabled: true,
			workflow_enabled: true,
			encryption_enabled: false,
		},
		primary_color: '#C75B39',
		secondary_color: '#D4A853',
	});

	const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

	const handleNameChange = (name: string) => {
		setFormData((prev) => ({
			...prev,
			name,
			slug: generateSlug(name),
		}));
	};

	const handlePlanSelect = (plan: Plan) => {
		setFormData((prev) => ({
			...prev,
			plan: plan.id,
			max_users: plan.features.max_users ?? undefined,
			max_storage_gb: plan.features.max_storage_gb ?? undefined,
			features: {
				ocr_enabled: plan.features.ocr_enabled,
				ai_features_enabled: plan.features.ai_features_enabled,
				workflow_enabled: plan.features.workflow_enabled,
				encryption_enabled: plan.features.encryption_enabled,
			},
		}));
	};

	const handleNext = () => {
		const idx = currentStepIndex;
		if (idx < steps.length - 1) {
			setCurrentStep(steps[idx + 1].id);
		}
	};

	const handleBack = () => {
		const idx = currentStepIndex;
		if (idx > 0) {
			setCurrentStep(steps[idx - 1].id);
		}
	};

	const handleCreate = async () => {
		setCreating(true);
		try {
			const { primary_color, secondary_color, ...tenantData } = formData;
			await createTenant(tenantData);
			onComplete();
		} catch (err) {
			console.error('Failed to create tenant:', err);
		} finally {
			setCreating(false);
		}
	};

	const selectedPlan = AVAILABLE_PLANS.find((p) => p.id === formData.plan);

	return (
		<div className={styles.wizard}>
			{/* Steps indicator */}
			<div className={styles.wizardSteps}>
				{steps.map((step, idx) => (
					<div
						key={step.id}
						className={`${styles.wizardStep} ${
							currentStepIndex === idx
								? styles.active
								: currentStepIndex > idx
									? styles.completed
									: ''
						}`}
					>
						<div className={styles.stepNumber}>
							{currentStepIndex > idx ? '✓' : idx + 1}
						</div>
						<span className={styles.stepLabel}>{step.label}</span>
					</div>
				))}
			</div>

			{/* Content */}
			<div className={styles.wizardContent}>
				{currentStep === 'basic' && (
					<div>
						<h3
							className={styles.sectionTitle}
							style={{ margin: '0 0 1.5rem', border: 'none', padding: 0 }}
						>
							Organization Details
						</h3>
						<div className={styles.formGrid}>
							<div className={styles.formGroup}>
								<label className={styles.formLabel}>Organization Name *</label>
								<input
									type="text"
									className={styles.formInput}
									value={formData.name}
									onChange={(e) => handleNameChange(e.target.value)}
									placeholder="Acme Corporation"
									autoFocus
								/>
							</div>

							<div className={styles.formGroup}>
								<label className={styles.formLabel}>URL Slug *</label>
								<input
									type="text"
									className={styles.formInput}
									value={formData.slug}
									onChange={(e) =>
										setFormData({ ...formData, slug: e.target.value })
									}
									placeholder="acme-corp"
									style={{ fontFamily: "'JetBrains Mono', monospace" }}
								/>
								<p
									style={{
										margin: '0.375rem 0 0',
										fontSize: '0.75rem',
										color: 'var(--ink-muted)',
									}}
								>
									Used in URLs: {formData.slug || 'your-org'}.darchiva.app
								</p>
							</div>

							<div className={styles.formGroup}>
								<label className={styles.formLabel}>Contact Email</label>
								<input
									type="email"
									className={styles.formInput}
									value={formData.contact_email}
									onChange={(e) =>
										setFormData({ ...formData, contact_email: e.target.value })
									}
									placeholder="admin@example.com"
								/>
							</div>

							<div className={styles.formGroup}>
								<label className={styles.formLabel}>Contact Phone</label>
								<input
									type="tel"
									className={styles.formInput}
									value={formData.contact_phone}
									onChange={(e) =>
										setFormData({ ...formData, contact_phone: e.target.value })
									}
									placeholder="+1 (555) 000-0000"
								/>
							</div>

							<div className={styles.formGroupFull}>
								<label className={styles.formLabel}>Billing Email</label>
								<input
									type="email"
									className={styles.formInput}
									value={formData.billing_email}
									onChange={(e) =>
										setFormData({ ...formData, billing_email: e.target.value })
									}
									placeholder="billing@example.com"
								/>
							</div>
						</div>
					</div>
				)}

				{currentStep === 'plan' && (
					<div>
						<h3
							className={styles.sectionTitle}
							style={{ margin: '0 0 1.5rem', border: 'none', padding: 0 }}
						>
							Choose a Plan
						</h3>
						<div className={styles.planCards}>
							{AVAILABLE_PLANS.map((plan) => (
								<div
									key={plan.id}
									className={`${styles.planCard} ${formData.plan === plan.id ? styles.selected : ''} ${plan.popular ? styles.popular : ''}`}
									onClick={() => handlePlanSelect(plan)}
								>
									<h4 className={styles.planName}>{plan.name}</h4>
									<div className={styles.planPrice}>
										${plan.price_monthly}
										<span>/month</span>
									</div>
									<p className={styles.planDescription}>{plan.description}</p>
									<ul className={styles.planFeatures}>
										<li>
											{plan.features.max_users
												? `${plan.features.max_users} users`
												: 'Unlimited users'}
										</li>
										<li>
											{plan.features.max_storage_gb
												? `${plan.features.max_storage_gb} GB storage`
												: 'Unlimited storage'}
										</li>
										{plan.features.ai_features_enabled && <li>AI-powered features</li>}
										{plan.features.workflow_enabled && <li>Workflow automation</li>}
										{plan.features.encryption_enabled && <li>End-to-end encryption</li>}
										{plan.features.custom_branding && <li>Custom branding</li>}
										{plan.features.api_access && <li>API access</li>}
										{plan.features.priority_support && <li>Priority support</li>}
									</ul>
								</div>
							))}
						</div>
					</div>
				)}

				{currentStep === 'branding' && (
					<div>
						<h3
							className={styles.sectionTitle}
							style={{ margin: '0 0 1.5rem', border: 'none', padding: 0 }}
						>
							Brand Identity
						</h3>
						<div className={styles.colorPickers} style={{ marginBottom: '2rem' }}>
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

						<div
							style={{
								padding: '1.5rem',
								background: `linear-gradient(135deg, ${formData.primary_color}15 0%, ${formData.secondary_color}15 100%)`,
								borderRadius: '8px',
								border: '1px solid var(--cream-dark)',
							}}
						>
							<p style={{ margin: '0 0 1rem', color: 'var(--ink-muted)', fontSize: '0.875rem' }}>
								Preview
							</p>
							<div style={{ display: 'flex', gap: '0.75rem' }}>
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
									Primary Button
								</button>
								<span
									style={{
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
					</div>
				)}

				{currentStep === 'features' && (
					<div>
						<h3
							className={styles.sectionTitle}
							style={{ margin: '0 0 1.5rem', border: 'none', padding: 0 }}
						>
							Feature Configuration
						</h3>
						<p style={{ color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
							These settings are based on your <strong>{selectedPlan?.name}</strong> plan
							and can be adjusted later.
						</p>

						{[
							{
								key: 'ocr_enabled' as const,
								label: 'OCR Processing',
								desc: 'Extract text from scanned documents',
							},
							{
								key: 'ai_features_enabled' as const,
								label: 'AI Features',
								desc: 'Document classification and smart suggestions',
							},
							{
								key: 'workflow_enabled' as const,
								label: 'Workflows',
								desc: 'Automated document routing',
							},
							{
								key: 'encryption_enabled' as const,
								label: 'Encryption',
								desc: 'End-to-end document encryption',
							},
						].map((feature) => (
							<div key={feature.key} className={styles.toggleRow}>
								<div className={styles.toggleInfo}>
									<h4>{feature.label}</h4>
									<p>{feature.desc}</p>
								</div>
								<button
									type="button"
									className={`${styles.toggle} ${formData.features?.[feature.key] ? styles.active : ''}`}
									onClick={() =>
										setFormData((prev) => ({
											...prev,
											features: {
												...prev.features,
												[feature.key]: !prev.features?.[feature.key],
											},
										}))
									}
								/>
							</div>
						))}

						<div className={styles.statsGrid} style={{ marginTop: '2rem' }}>
							<div className={styles.statCard}>
								<div className={styles.statLabel}>User Limit</div>
								<div className={styles.statValue}>
									{formData.max_users || '∞'}
								</div>
							</div>
							<div className={styles.statCard}>
								<div className={styles.statLabel}>Storage Limit</div>
								<div className={styles.statValue}>
									{formData.max_storage_gb ? `${formData.max_storage_gb} GB` : '∞'}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Actions */}
				<div className={styles.wizardActions}>
					<div>
						{currentStepIndex > 0 && (
							<button className={styles.secondaryButton} onClick={handleBack}>
								Back
							</button>
						)}
					</div>
					<div style={{ display: 'flex', gap: '0.75rem' }}>
						<button className={styles.secondaryButton} onClick={onCancel}>
							Cancel
						</button>
						{currentStepIndex < steps.length - 1 ? (
							<button
								className={styles.primaryButton}
								onClick={handleNext}
								disabled={!formData.name || !formData.slug}
							>
								Continue
							</button>
						) : (
							<button
								className={styles.primaryButton}
								onClick={handleCreate}
								disabled={creating}
							>
								{creating ? 'Creating...' : 'Create Organization'}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
