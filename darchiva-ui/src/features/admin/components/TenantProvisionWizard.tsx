// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProvisionTenant, TenantProvisionRequest } from '../api';
import styles from './TenantProvisionWizard.module.css';

type Step = 'organization' | 'plan' | 'storage' | 'ai' | 'review';

const STEPS: { id: Step; label: string; number: number }[] = [
	{ id: 'organization', label: 'Organization', number: 1 },
	{ id: 'plan', label: 'Plan', number: 2 },
	{ id: 'storage', label: 'Storage', number: 3 },
	{ id: 'ai', label: 'AI Config', number: 4 },
	{ id: 'review', label: 'Review', number: 5 },
];

const PLANS = [
	{
		id: 'free',
		name: 'Free',
		price: '$0',
		period: '/forever',
		features: ['5 users', '1GB storage', 'Basic OCR', 'Email support'],
		color: '#6b7280',
	},
	{
		id: 'starter',
		name: 'Starter',
		price: '$29',
		period: '/month',
		features: ['10 users', '10GB storage', 'Full OCR', 'AI classification', 'Priority support'],
		color: '#60a5fa',
		recommended: true,
	},
	{
		id: 'professional',
		name: 'Professional',
		price: '$99',
		period: '/month',
		features: ['50 users', '100GB storage', 'Advanced AI', 'Workflows', 'API access', 'Dedicated support'],
		color: '#c9a227',
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: 'Custom',
		period: '',
		features: ['Unlimited users', 'Unlimited storage', 'Custom AI models', 'SLA', 'On-premise option'],
		color: '#a855f7',
	},
];

interface Props {
	onComplete: () => void;
	onCancel: () => void;
}

export function TenantProvisionWizard({ onComplete, onCancel }: Props) {
	const [currentStep, setCurrentStep] = useState<Step>('organization');
	const [formData, setFormData] = useState<TenantProvisionRequest>({
		name: '',
		slug: '',
		contactEmail: '',
		adminEmail: '',
		plan: 'starter',
		billingCycle: 'monthly',
		maxUsers: 10,
		maxStorageGb: 10,
		storageProvider: 's3',
		storageRegion: 'us-east-1',
		aiProvider: 'openai',
		aiMonthlyTokens: 100000,
	});

	const provision = useProvisionTenant();

	const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

	const goNext = () => {
		const nextIndex = currentStepIndex + 1;
		if (nextIndex < STEPS.length) {
			setCurrentStep(STEPS[nextIndex].id);
		}
	};

	const goPrev = () => {
		const prevIndex = currentStepIndex - 1;
		if (prevIndex >= 0) {
			setCurrentStep(STEPS[prevIndex].id);
		}
	};

	const handleSubmit = async () => {
		try {
			await provision.mutateAsync(formData);
			onComplete();
		} catch (error) {
			console.error('Provisioning failed:', error);
		}
	};

	const updateField = (field: keyof TenantProvisionRequest, value: string | number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const generateSlug = (name: string) => {
		return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	};

	return (
		<div className={styles.wizard}>
			{/* Header */}
			<div className={styles.wizardHeader}>
				<button onClick={onCancel} className={styles.cancelBtn}>
					← Back to Dashboard
				</button>
				<h2 className={styles.wizardTitle}>Provision New Tenant</h2>
				<p className={styles.wizardSubtitle}>Complete the following steps to set up a new customer organization</p>
			</div>

			{/* Progress Steps */}
			<div className={styles.progressBar}>
				{STEPS.map((step, index) => (
					<div
						key={step.id}
						className={`${styles.progressStep} ${currentStepIndex >= index ? styles.completed : ''} ${currentStep === step.id ? styles.active : ''}`}
					>
						<div className={styles.stepNumber}>{step.number}</div>
						<span className={styles.stepLabel}>{step.label}</span>
						{index < STEPS.length - 1 && <div className={styles.stepConnector} />}
					</div>
				))}
			</div>

			{/* Step Content */}
			<AnimatePresence mode="wait">
				<motion.div
					key={currentStep}
					className={styles.stepContent}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.2 }}
				>
					{currentStep === 'organization' && (
						<OrganizationStep
							formData={formData}
							updateField={updateField}
							generateSlug={generateSlug}
						/>
					)}

					{currentStep === 'plan' && (
						<PlanStep
							selectedPlan={formData.plan || 'starter'}
							onSelect={(plan) => updateField('plan', plan)}
						/>
					)}

					{currentStep === 'storage' && (
						<StorageStep
							formData={formData}
							updateField={updateField}
						/>
					)}

					{currentStep === 'ai' && (
						<AIStep
							formData={formData}
							updateField={updateField}
						/>
					)}

					{currentStep === 'review' && (
						<ReviewStep formData={formData} />
					)}
				</motion.div>
			</AnimatePresence>

			{/* Navigation */}
			<div className={styles.wizardNav}>
				{currentStepIndex > 0 && (
					<button onClick={goPrev} className={styles.navBtn}>
						← Previous
					</button>
				)}

				<div className={styles.navSpacer} />

				{currentStepIndex < STEPS.length - 1 ? (
					<button onClick={goNext} className={styles.navBtnPrimary}>
						Continue →
					</button>
				) : (
					<button
						onClick={handleSubmit}
						disabled={provision.isPending}
						className={styles.navBtnSubmit}
					>
						{provision.isPending ? 'Provisioning...' : 'Provision Tenant'}
					</button>
				)}
			</div>
		</div>
	);
}

// Step Components
function OrganizationStep({
	formData,
	updateField,
	generateSlug,
}: {
	formData: TenantProvisionRequest;
	updateField: (field: keyof TenantProvisionRequest, value: string | number) => void;
	generateSlug: (name: string) => string;
}) {
	return (
		<div className={styles.stepForm}>
			<h3 className={styles.stepTitle}>Organization Details</h3>
			<p className={styles.stepDescription}>Enter the basic information for this tenant</p>

			<div className={styles.formGrid}>
				<div className={styles.fieldGroup}>
					<label className={styles.label}>
						Organization Name
						<span className={styles.required}>*</span>
					</label>
					<input
						type="text"
						value={formData.name}
						onChange={(e) => {
							updateField('name', e.target.value);
							if (!formData.slug) {
								updateField('slug', generateSlug(e.target.value));
							}
						}}
						placeholder="Acme Corporation"
						className={styles.input}
					/>
				</div>

				<div className={styles.fieldGroup}>
					<label className={styles.label}>
						Slug
						<span className={styles.required}>*</span>
					</label>
					<div className={styles.inputWithPrefix}>
						<span className={styles.inputPrefix}>darchiva.io/</span>
						<input
							type="text"
							value={formData.slug}
							onChange={(e) => updateField('slug', generateSlug(e.target.value))}
							placeholder="acme-corp"
							className={styles.input}
						/>
					</div>
				</div>

				<div className={styles.fieldGroup}>
					<label className={styles.label}>
						Contact Email
						<span className={styles.required}>*</span>
					</label>
					<input
						type="email"
						value={formData.contactEmail}
						onChange={(e) => updateField('contactEmail', e.target.value)}
						placeholder="admin@acme.com"
						className={styles.input}
					/>
				</div>

				<div className={styles.fieldGroup}>
					<label className={styles.label}>
						Admin User Email
						<span className={styles.required}>*</span>
					</label>
					<input
						type="email"
						value={formData.adminEmail}
						onChange={(e) => updateField('adminEmail', e.target.value)}
						placeholder="john@acme.com"
						className={styles.input}
					/>
					<span className={styles.fieldHint}>This user will receive the setup email</span>
				</div>
			</div>
		</div>
	);
}

function PlanStep({
	selectedPlan,
	onSelect,
}: {
	selectedPlan: string;
	onSelect: (plan: string) => void;
}) {
	return (
		<div className={styles.stepForm}>
			<h3 className={styles.stepTitle}>Select Plan</h3>
			<p className={styles.stepDescription}>Choose the subscription tier for this tenant</p>

			<div className={styles.planGrid}>
				{PLANS.map((plan) => (
					<motion.div
						key={plan.id}
						className={`${styles.planCard} ${selectedPlan === plan.id ? styles.selected : ''}`}
						onClick={() => onSelect(plan.id)}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						style={{
							'--plan-color': plan.color,
						} as React.CSSProperties}
					>
						{plan.recommended && (
							<div className={styles.recommendedBadge}>RECOMMENDED</div>
						)}

						<div className={styles.planHeader}>
							<h4 className={styles.planName}>{plan.name}</h4>
							<div className={styles.planPrice}>
								<span className={styles.priceValue}>{plan.price}</span>
								<span className={styles.pricePeriod}>{plan.period}</span>
							</div>
						</div>

						<ul className={styles.planFeatures}>
							{plan.features.map((feature, i) => (
								<li key={i}>
									<span className={styles.featureCheck}>✓</span>
									{feature}
								</li>
							))}
						</ul>

						<div className={styles.planSelector}>
							<div className={`${styles.radioOuter} ${selectedPlan === plan.id ? styles.checked : ''}`}>
								<div className={styles.radioInner} />
							</div>
							<span>Select {plan.name}</span>
						</div>
					</motion.div>
				))}
			</div>
		</div>
	);
}

function StorageStep({
	formData,
	updateField,
}: {
	formData: TenantProvisionRequest;
	updateField: (field: keyof TenantProvisionRequest, value: string | number) => void;
}) {
	const providers = [
		{ id: 'local', name: 'Local Storage', description: 'On-server storage (not recommended for production)' },
		{ id: 's3', name: 'AWS S3', description: 'Amazon Simple Storage Service' },
		{ id: 'linode', name: 'Linode Object Storage', description: 'S3-compatible object storage' },
		{ id: 'azure', name: 'Azure Blob', description: 'Microsoft Azure Blob Storage' },
		{ id: 'gcs', name: 'Google Cloud Storage', description: 'Google Cloud Platform storage' },
	];

	return (
		<div className={styles.stepForm}>
			<h3 className={styles.stepTitle}>Storage Configuration</h3>
			<p className={styles.stepDescription}>Configure where this tenant's documents will be stored</p>

			<div className={styles.providerGrid}>
				{providers.map((provider) => (
					<div
						key={provider.id}
						className={`${styles.providerCard} ${formData.storageProvider === provider.id ? styles.selected : ''}`}
						onClick={() => updateField('storageProvider', provider.id)}
					>
						<div className={styles.providerRadio}>
							<div className={`${styles.radioOuter} ${formData.storageProvider === provider.id ? styles.checked : ''}`}>
								<div className={styles.radioInner} />
							</div>
						</div>
						<div className={styles.providerInfo}>
							<span className={styles.providerName}>{provider.name}</span>
							<span className={styles.providerDesc}>{provider.description}</span>
						</div>
					</div>
				))}
			</div>

			{formData.storageProvider !== 'local' && (
				<div className={styles.formGrid} style={{ marginTop: '2rem' }}>
					<div className={styles.fieldGroup}>
						<label className={styles.label}>Region</label>
						<select
							value={formData.storageRegion}
							onChange={(e) => updateField('storageRegion', e.target.value)}
							className={styles.select}
						>
							<option value="us-east-1">US East (N. Virginia)</option>
							<option value="us-west-2">US West (Oregon)</option>
							<option value="eu-west-1">EU (Ireland)</option>
							<option value="ap-southeast-1">Asia Pacific (Singapore)</option>
						</select>
					</div>

					{formData.storageProvider === 'linode' && (
						<div className={styles.fieldGroup}>
							<label className={styles.label}>Endpoint URL</label>
							<input
								type="text"
								value={formData.storageEndpoint || ''}
								onChange={(e) => updateField('storageEndpoint', e.target.value)}
								placeholder="https://us-east-1.linodeobjects.com"
								className={styles.input}
							/>
						</div>
					)}

					<div className={styles.fieldGroup}>
						<label className={styles.label}>Storage Quota (GB)</label>
						<input
							type="number"
							value={formData.maxStorageGb}
							onChange={(e) => updateField('maxStorageGb', parseInt(e.target.value) || 0)}
							className={styles.input}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

function AIStep({
	formData,
	updateField,
}: {
	formData: TenantProvisionRequest;
	updateField: (field: keyof TenantProvisionRequest, value: string | number) => void;
}) {
	const providers = [
		{ id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
		{ id: 'anthropic', name: 'Anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
		{ id: 'azure_openai', name: 'Azure OpenAI', models: ['gpt-4', 'gpt-35-turbo'] },
	];

	return (
		<div className={styles.stepForm}>
			<h3 className={styles.stepTitle}>AI Configuration</h3>
			<p className={styles.stepDescription}>Set up AI features for document processing and analysis</p>

			<div className={styles.formGrid}>
				<div className={styles.fieldGroup}>
					<label className={styles.label}>AI Provider</label>
					<select
						value={formData.aiProvider}
						onChange={(e) => updateField('aiProvider', e.target.value)}
						className={styles.select}
					>
						{providers.map(p => (
							<option key={p.id} value={p.id}>{p.name}</option>
						))}
					</select>
				</div>

				<div className={styles.fieldGroup}>
					<label className={styles.label}>Monthly Token Limit</label>
					<input
						type="number"
						value={formData.aiMonthlyTokens}
						onChange={(e) => updateField('aiMonthlyTokens', parseInt(e.target.value) || 0)}
						className={styles.input}
					/>
					<span className={styles.fieldHint}>
						{((formData.aiMonthlyTokens || 0) / 1000).toLocaleString()}K tokens/month
					</span>
				</div>
			</div>

			<div className={styles.aiFeaturesList}>
				<h4>Enabled AI Features</h4>
				<div className={styles.featureCheckboxes}>
					<label className={styles.checkbox}>
						<input type="checkbox" defaultChecked />
						<span>Document Classification</span>
					</label>
					<label className={styles.checkbox}>
						<input type="checkbox" defaultChecked />
						<span>Data Extraction</span>
					</label>
					<label className={styles.checkbox}>
						<input type="checkbox" defaultChecked />
						<span>Summarization</span>
					</label>
					<label className={styles.checkbox}>
						<input type="checkbox" />
						<span>Chat Assistant</span>
					</label>
				</div>
			</div>
		</div>
	);
}

function ReviewStep({ formData }: { formData: TenantProvisionRequest }) {
	const selectedPlan = PLANS.find(p => p.id === formData.plan);

	return (
		<div className={styles.stepForm}>
			<h3 className={styles.stepTitle}>Review & Confirm</h3>
			<p className={styles.stepDescription}>Please verify all details before provisioning</p>

			<div className={styles.reviewSections}>
				<div className={styles.reviewSection}>
					<h4>Organization</h4>
					<div className={styles.reviewGrid}>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Name</span>
							<span className={styles.reviewValue}>{formData.name || '—'}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Slug</span>
							<span className={styles.reviewValue}>/{formData.slug || '—'}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Contact</span>
							<span className={styles.reviewValue}>{formData.contactEmail || '—'}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Admin</span>
							<span className={styles.reviewValue}>{formData.adminEmail || '—'}</span>
						</div>
					</div>
				</div>

				<div className={styles.reviewSection}>
					<h4>Subscription</h4>
					<div className={styles.reviewGrid}>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Plan</span>
							<span className={styles.reviewValue} style={{ color: selectedPlan?.color }}>
								{selectedPlan?.name || '—'}
							</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Users</span>
							<span className={styles.reviewValue}>{formData.maxUsers}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Storage</span>
							<span className={styles.reviewValue}>{formData.maxStorageGb} GB</span>
						</div>
					</div>
				</div>

				<div className={styles.reviewSection}>
					<h4>Infrastructure</h4>
					<div className={styles.reviewGrid}>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Storage Provider</span>
							<span className={styles.reviewValue}>{formData.storageProvider?.toUpperCase()}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>Region</span>
							<span className={styles.reviewValue}>{formData.storageRegion}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>AI Provider</span>
							<span className={styles.reviewValue}>{formData.aiProvider}</span>
						</div>
						<div className={styles.reviewItem}>
							<span className={styles.reviewLabel}>AI Tokens</span>
							<span className={styles.reviewValue}>{((formData.aiMonthlyTokens || 0) / 1000).toLocaleString()}K/mo</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default TenantProvisionWizard;
