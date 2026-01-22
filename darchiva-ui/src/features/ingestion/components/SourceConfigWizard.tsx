// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { useCreateSource, SourceType } from '../api';
import styles from './SourceConfigWizard.module.css';

type Step = 'type' | 'config' | 'options' | 'review';

const SOURCE_TYPES: { type: SourceType; label: string; description: string }[] = [
	{ type: 'folder_watch', label: 'Folder Watch', description: 'Monitor a local folder for new files' },
	{ type: 'email', label: 'Email Inbox', description: 'Import documents from email attachments' },
	{ type: 'scanner', label: 'Scanner', description: 'Receive documents from connected scanners' },
	{ type: 'cloud_storage', label: 'Cloud Storage', description: 'Sync from S3, Azure, or GCS buckets' },
	{ type: 'api', label: 'API Upload', description: 'Accept documents via REST API' },
];

interface WizardData {
	name: string;
	type: SourceType;
	config: Record<string, string>;
	applyOcr: boolean;
	autoRoute: boolean;
}

export function SourceConfigWizard({ onComplete }: { onComplete?: () => void }) {
	const [step, setStep] = useState<Step>('type');
	const [data, setData] = useState<WizardData>({
		name: '',
		type: 'folder_watch',
		config: {},
		applyOcr: true,
		autoRoute: true,
	});

	const createSource = useCreateSource();

	const handleTypeSelect = (type: SourceType) => {
		setData({ ...data, type, config: {} });
		setStep('config');
	};

	const renderTypeStep = () => (
		<div className={styles.stepContent}>
			<h4>Select Source Type</h4>
			<div className={styles.typeGrid}>
				{SOURCE_TYPES.map((st) => (
					<button
						key={st.type}
						className={styles.typeCard}
						onClick={() => handleTypeSelect(st.type)}
					>
						<span className={styles.typeLabel}>{st.label}</span>
						<span className={styles.typeDesc}>{st.description}</span>
					</button>
				))}
			</div>
		</div>
	);

	const renderConfigStep = () => {
		const configFields: Record<SourceType, { key: string; label: string; type?: string }[]> = {
			folder_watch: [
				{ key: 'path', label: 'Folder Path' },
				{ key: 'patterns', label: 'File Patterns (e.g., *.pdf,*.tiff)' },
			],
			email: [
				{ key: 'address', label: 'Email Address' },
				{ key: 'imapHost', label: 'IMAP Host' },
				{ key: 'imapPort', label: 'IMAP Port' },
				{ key: 'username', label: 'Username' },
				{ key: 'password', label: 'Password', type: 'password' },
			],
			scanner: [
				{ key: 'scannerId', label: 'Scanner ID' },
			],
			cloud_storage: [
				{ key: 'provider', label: 'Provider (s3/azure/gcs)' },
				{ key: 'bucket', label: 'Bucket Name' },
				{ key: 'prefix', label: 'Prefix (optional)' },
				{ key: 'accessKey', label: 'Access Key' },
				{ key: 'secretKey', label: 'Secret Key', type: 'password' },
			],
			api: [
				{ key: 'webhookUrl', label: 'Webhook URL (optional)' },
			],
		};

		const fields = configFields[data.type] || [];

		return (
			<div className={styles.stepContent}>
				<h4>Configure {SOURCE_TYPES.find((t) => t.type === data.type)?.label}</h4>
				<div className={styles.form}>
					<div className={styles.field}>
						<label>Source Name</label>
						<input
							type="text"
							value={data.name}
							onChange={(e) => setData({ ...data, name: e.target.value })}
							placeholder="My Ingestion Source"
							className={styles.input}
						/>
					</div>
					{fields.map((field) => (
						<div key={field.key} className={styles.field}>
							<label>{field.label}</label>
							<input
								type={field.type || 'text'}
								value={data.config[field.key] || ''}
								onChange={(e) =>
									setData({
										...data,
										config: { ...data.config, [field.key]: e.target.value },
									})
								}
								className={styles.input}
							/>
						</div>
					))}
				</div>
				<div className={styles.navButtons}>
					<button onClick={() => setStep('type')} className={styles.backBtn}>Back</button>
					<button onClick={() => setStep('options')} className={styles.nextBtn}>Next</button>
				</div>
			</div>
		);
	};

	const renderOptionsStep = () => (
		<div className={styles.stepContent}>
			<h4>Processing Options</h4>
			<div className={styles.optionsList}>
				<label className={styles.option}>
					<input
						type="checkbox"
						checked={data.applyOcr}
						onChange={(e) => setData({ ...data, applyOcr: e.target.checked })}
					/>
					<div>
						<span className={styles.optionLabel}>Apply OCR</span>
						<span className={styles.optionDesc}>Extract text from scanned documents</span>
					</div>
				</label>
				<label className={styles.option}>
					<input
						type="checkbox"
						checked={data.autoRoute}
						onChange={(e) => setData({ ...data, autoRoute: e.target.checked })}
					/>
					<div>
						<span className={styles.optionLabel}>Auto-Route</span>
						<span className={styles.optionDesc}>Automatically route to workflows</span>
					</div>
				</label>
			</div>
			<div className={styles.navButtons}>
				<button onClick={() => setStep('config')} className={styles.backBtn}>Back</button>
				<button onClick={() => setStep('review')} className={styles.nextBtn}>Review</button>
			</div>
		</div>
	);

	const renderReviewStep = () => (
		<div className={styles.stepContent}>
			<h4>Review Configuration</h4>
			<div className={styles.review}>
				<div className={styles.reviewItem}>
					<span className={styles.reviewLabel}>Name</span>
					<span>{data.name || 'Unnamed'}</span>
				</div>
				<div className={styles.reviewItem}>
					<span className={styles.reviewLabel}>Type</span>
					<span>{SOURCE_TYPES.find((t) => t.type === data.type)?.label}</span>
				</div>
				<div className={styles.reviewItem}>
					<span className={styles.reviewLabel}>OCR</span>
					<span>{data.applyOcr ? 'Yes' : 'No'}</span>
				</div>
				<div className={styles.reviewItem}>
					<span className={styles.reviewLabel}>Auto-Route</span>
					<span>{data.autoRoute ? 'Yes' : 'No'}</span>
				</div>
			</div>
			<div className={styles.navButtons}>
				<button onClick={() => setStep('options')} className={styles.backBtn}>Back</button>
				<button
					onClick={async () => {
						await createSource.mutateAsync({
							name: data.name || 'Unnamed Source',
							type: data.type,
							config: data.config,
						});
						onComplete?.();
					}}
					disabled={createSource.isPending}
					className={styles.createBtn}
				>
					{createSource.isPending ? 'Creating...' : 'Create Source'}
				</button>
			</div>
		</div>
	);

	const steps: Record<Step, () => JSX.Element> = {
		type: renderTypeStep,
		config: renderConfigStep,
		options: renderOptionsStep,
		review: renderReviewStep,
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h3>Create Ingestion Source</h3>
				<div className={styles.stepIndicator}>
					{(['type', 'config', 'options', 'review'] as Step[]).map((s, i) => (
						<span
							key={s}
							className={`${styles.stepDot} ${step === s ? styles.active : ''} ${
								['type', 'config', 'options', 'review'].indexOf(step) > i ? styles.done : ''
							}`}
						/>
					))}
				</div>
			</div>
			{steps[step]()}
		</div>
	);
}

export default SourceConfigWizard;
