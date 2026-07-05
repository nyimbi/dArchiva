// (c) Copyright Datacraft, 2026
/**
 * OnboardingWizard - full-screen modal overlay for first-login tenant setup.
 */
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
	ArrowLeft,
	CheckCircle2,
	Cloud,
	FileUp,
	HardDriveUpload,
	Mail,
	PartyPopper,
	Plus,
	ShieldCheck,
	Users,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { useCompleteStep, useOnboardingStatus } from './api';

interface WizardProps {
	onDone: () => void;
}

type InviteRole = 'admin' | 'manager' | 'viewer';

interface InviteEntry {
	id: string;
	email: string;
	role: InviteRole;
}

const STEPS = [
	{ id: 'welcome', label: 'Welcome' },
	{ id: 'organization_setup', label: 'Organization Setup' },
	{ id: 'invite_team', label: 'Invite Team' },
	{ id: 'first_document', label: 'First Document' },
	{ id: 'connect_sources', label: 'Connect Sources' },
	{ id: 'done', label: 'Done' },
] as const;

const timezones = ['Africa/Nairobi', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai'];
const languages = ['English', 'Kiswahili', 'French', 'Arabic'];
const sourceOptions = [
	{ id: 'email', label: 'Email', icon: Mail, description: 'Forward documents into a monitored inbox.' },
	{ id: 'sftp', label: 'SFTP', icon: HardDriveUpload, description: 'Drop files into a secure transfer folder.' },
	{ id: 'cloud_storage', label: 'Cloud storage', icon: Cloud, description: 'Sync from shared cloud folders.' },
];

function Confetti() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const pieces = Array.from({ length: 120 }, () => ({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height - canvas.height,
			w: Math.random() * 10 + 5,
			h: Math.random() * 6 + 4,
			color: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][
				Math.floor(Math.random() * 5)
			],
			vx: (Math.random() - 0.5) * 2,
			vy: Math.random() * 3 + 1,
			angle: Math.random() * Math.PI * 2,
			spin: (Math.random() - 0.5) * 0.2,
		}));

		let frame = 0;
		const draw = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (const p of pieces) {
				ctx.save();
				ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
				ctx.rotate(p.angle);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx.restore();
				p.x += p.vx;
				p.y += p.vy;
				p.angle += p.spin;
				if (p.y > canvas.height) {
					p.y = -p.h;
					p.x = Math.random() * canvas.width;
				}
			}
			frame = requestAnimationFrame(draw);
		};

		draw();
		const timer = window.setTimeout(() => cancelAnimationFrame(frame), 4000);
		return () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(timer);
		};
	}, []);

	return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60]" aria-hidden />;
}

function ProgressBar({ current }: { current: number }) {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase text-slate-400">Step {current} of {STEPS.length}</span>
				<span className="text-xs font-medium text-indigo-300">{STEPS[current - 1].label}</span>
			</div>
			<div className="flex gap-1.5">
				{STEPS.map((step, index) => (
					<div
						key={step.id}
						className={`h-1.5 flex-1 rounded-full transition-colors ${
							index < current ? 'bg-indigo-500' : 'bg-slate-700'
						}`}
					/>
				))}
			</div>
		</div>
	);
}

function StepWelcome() {
	return (
		<div className="space-y-6">
			<div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
				<ShieldCheck className="h-7 w-7" />
			</div>
			<div>
				<h2 className="text-2xl font-semibold text-white">Welcome to dArchiva</h2>
				<p className="mt-2 text-sm leading-6 text-slate-400">
					Secure document capture, routing, search, and retention for teams that need audit-ready archives.
				</p>
			</div>
		</div>
	);
}

function StepOrganizationSetup({
	orgName,
	setOrgName,
	timezone,
	setTimezone,
	language,
	setLanguage,
	logoName,
	onLogoChange,
	error,
}: {
	orgName: string;
	setOrgName: (value: string) => void;
	timezone: string;
	setTimezone: (value: string) => void;
	language: string;
	setLanguage: (value: string) => void;
	logoName: string;
	onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void;
	error: string | null;
}) {
	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-xl font-semibold text-white">Organization setup</h2>
				<p className="mt-1 text-sm text-slate-400">Set the tenant defaults users see across the workspace.</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1 sm:col-span-2">
					<Label htmlFor="org-name" className="text-slate-300">Organization name</Label>
					<Input
						id="org-name"
						value={orgName}
						onChange={(event) => setOrgName(event.target.value)}
						placeholder="Datacraft Archives"
						className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="org-timezone" className="text-slate-300">Timezone</Label>
					<select
						id="org-timezone"
						value={timezone}
						onChange={(event) => setTimezone(event.target.value)}
						className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white"
					>
						{timezones.map((option) => <option key={option} value={option}>{option}</option>)}
					</select>
				</div>
				<div className="space-y-1">
					<Label htmlFor="org-language" className="text-slate-300">Language</Label>
					<select
						id="org-language"
						value={language}
						onChange={(event) => setLanguage(event.target.value)}
						className="h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white"
					>
						{languages.map((option) => <option key={option} value={option}>{option}</option>)}
					</select>
				</div>
				<div className="space-y-1 sm:col-span-2">
					<Label htmlFor="org-logo" className="text-slate-300">Logo</Label>
					<label
						htmlFor="org-logo"
						className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300 hover:border-indigo-400"
					>
						<span>{logoName || 'Upload logo file'}</span>
						<FileUp className="h-4 w-4" />
					</label>
					<input id="org-logo" type="file" accept="image/*" onChange={onLogoChange} className="sr-only" />
				</div>
			</div>
			{error && <p className="text-sm text-red-400">{error}</p>}
		</div>
	);
}

function StepInviteTeam({
	invites,
	email,
	setEmail,
	role,
	setRole,
	onAdd,
	onRoleChange,
	error,
}: {
	invites: InviteEntry[];
	email: string;
	setEmail: (value: string) => void;
	role: InviteRole;
	setRole: (value: InviteRole) => void;
	onAdd: () => void;
	onRoleChange: (id: string, role: InviteRole) => void;
	error: string | null;
}) {
	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-xl font-semibold text-white">Invite team</h2>
				<p className="mt-1 text-sm text-slate-400">Add multiple teammates now or skip and invite them later.</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
				<Input
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="teammate@example.com"
					className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
				/>
				<select
					value={role}
					onChange={(event) => setRole(event.target.value as InviteRole)}
					className="h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white"
				>
					<option value="admin">Admin</option>
					<option value="manager">Manager</option>
					<option value="viewer">Viewer</option>
				</select>
				<Button type="button" onClick={onAdd} className="bg-indigo-600 text-white hover:bg-indigo-500">
					<Plus className="h-4 w-4" />
					Add
				</Button>
			</div>
			{error && <p className="text-sm text-red-400">{error}</p>}
			<div className="space-y-2">
				{invites.length === 0 ? (
					<div className="rounded-md border border-slate-800 bg-slate-800/60 px-4 py-5 text-center text-sm text-slate-500">
						No invites added yet.
					</div>
				) : (
					invites.map((invite) => (
						<div key={invite.id} className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/60 px-3 py-2">
							<Users className="h-4 w-4 text-slate-500" />
							<span className="min-w-0 flex-1 truncate text-sm text-slate-200">{invite.email}</span>
							<select
								value={invite.role}
								onChange={(event) => onRoleChange(invite.id, event.target.value as InviteRole)}
								className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white"
							>
								<option value="admin">Admin</option>
								<option value="manager">Manager</option>
								<option value="viewer">Viewer</option>
							</select>
						</div>
					))
				)}
			</div>
		</div>
	);
}

function StepFirstDocument({
	fileName,
	isDragging,
	onDrop,
	onBrowse,
	onDragOver,
	onDragLeave,
}: {
	fileName: string;
	isDragging: boolean;
	onDrop: (event: DragEvent<HTMLLabelElement>) => void;
	onBrowse: (event: ChangeEvent<HTMLInputElement>) => void;
	onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
	onDragLeave: () => void;
}) {
	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-xl font-semibold text-white">First document</h2>
				<p className="mt-1 text-sm text-slate-400">Upload one sample document so your archive has a first asset.</p>
			</div>
			<label
				htmlFor="first-document"
				onDrop={onDrop}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors ${
					isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 bg-slate-800/70 hover:border-indigo-400'
				}`}
			>
				<FileUp className="mb-3 h-10 w-10 text-indigo-300" />
				<span className="text-sm font-medium text-white">{fileName || 'Drag and drop a document here'}</span>
				<span className="mt-1 text-xs text-slate-500">PDF, image, or office document</span>
			</label>
			<input id="first-document" type="file" onChange={onBrowse} className="sr-only" />
		</div>
	);
}

function StepConnectSources({
	selectedSources,
	onToggleSource,
}: {
	selectedSources: string[];
	onToggleSource: (sourceId: string) => void;
}) {
	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-xl font-semibold text-white">Connect sources</h2>
				<p className="mt-1 text-sm text-slate-400">Quick-add common intake paths for incoming documents.</p>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				{sourceOptions.map(({ id, label, icon: Icon, description }) => {
					const selected = selectedSources.includes(id);
					return (
						<button
							key={id}
							type="button"
							onClick={() => onToggleSource(id)}
							className={`rounded-lg border p-4 text-left transition-colors ${
								selected
									? 'border-indigo-400 bg-indigo-500/15 text-white'
									: 'border-slate-800 bg-slate-800/70 text-slate-300 hover:border-slate-600'
							}`}
						>
							<Icon className="h-5 w-5 text-indigo-300" />
							<span className="mt-3 block text-sm font-semibold">{label}</span>
							<span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function StepDone() {
	return (
		<div className="space-y-6 text-center">
			<Confetti />
			<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
				<PartyPopper className="h-8 w-8" />
			</div>
			<div>
				<h2 className="text-2xl font-semibold text-white">You are ready to archive</h2>
				<p className="mt-2 text-sm leading-6 text-slate-400">
					Jump into the places teams use most after setup.
				</p>
			</div>
			<div className="grid gap-2 sm:grid-cols-3">
				<a href="/documents" className="rounded-md border border-slate-800 bg-slate-800 px-3 py-3 text-sm text-slate-200 hover:border-indigo-400">
					Documents
				</a>
				<a href="/ingestion" className="rounded-md border border-slate-800 bg-slate-800 px-3 py-3 text-sm text-slate-200 hover:border-indigo-400">
					Ingestion
				</a>
				<a href="/settings" className="rounded-md border border-slate-800 bg-slate-800 px-3 py-3 text-sm text-slate-200 hover:border-indigo-400">
					Settings
				</a>
			</div>
		</div>
	);
}

export function OnboardingWizard({ onDone }: WizardProps) {
	const { data: status, isLoading } = useOnboardingStatus();
	const completeStep = useCompleteStep();
	const [step, setStep] = useState(1);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [orgName, setOrgName] = useState('');
	const [timezone, setTimezone] = useState('Africa/Nairobi');
	const [language, setLanguage] = useState('English');
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviteRole, setInviteRole] = useState<InviteRole>('viewer');
	const [invites, setInvites] = useState<InviteEntry[]>([]);
	const [firstDocument, setFirstDocument] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [selectedSources, setSelectedSources] = useState<string[]>([]);

	useEffect(() => {
		if (status?.isComplete) onDone();
	}, [status, onDone]);

	const currentStep = STEPS[step - 1];
	const canGoBack = step > 1 && step < STEPS.length;
	const primaryLabel = useMemo(() => {
		if (step === 1) return "Let's get started";
		if (step === STEPS.length) return 'Go to dashboard';
		return 'Next';
	}, [step]);

	if (isLoading) return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
			<div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-8 space-y-4">
				<div className="h-6 w-40 rounded bg-slate-700 animate-pulse" />
				<div className="h-4 w-64 rounded bg-slate-800 animate-pulse" />
				<div className="h-32 w-full rounded-xl bg-slate-800 animate-pulse" />
				<div className="flex justify-end gap-3">
					<div className="h-9 w-20 rounded bg-slate-800 animate-pulse" />
					<div className="h-9 w-28 rounded bg-slate-700 animate-pulse" />
				</div>
			</div>
		</div>
	);

	const markStepComplete = async (stepId = currentStep.id) => {
		try {
			await completeStep.mutateAsync(stepId);
		} catch {
			// The wizard can continue even if backend onboarding status is not wired yet.
		}
	};

	const goNext = async () => {
		setSaving(true);
		setError(null);
		try {
			if (step === 2) {
				if (!orgName.trim()) {
					setError('Organization name is required.');
					return;
				}
				const payload = { organization: { name: orgName.trim(), timezone, language } };
				await apiClient.patch('/settings', payload);
				if (logoFile) {
					const body = new FormData();
					body.append('logo', logoFile);
					await apiClient.patch('/settings', body);
				}
			}
			if (step === 3 && invites.length > 0) {
				await Promise.all(invites.map((invite) => apiClient.post('/users/invite', invite)));
			}
			if (step === 4 && firstDocument) {
				const body = new FormData();
				body.append('file', firstDocument);
				await apiClient.post('/documents/upload', body);
			}
			if (step === 5 && selectedSources.length > 0) {
				await Promise.all(selectedSources.map((source) => apiClient.post('/ingestion/sources/quick-add', { source })));
			}
			await markStepComplete();
			if (step === STEPS.length) {
				onDone();
			} else {
				setStep((value) => value + 1);
			}
		} catch {
			setError('Could not save this step. You can skip it and continue.');
		} finally {
			setSaving(false);
		}
	};

	const skipStep = async () => {
		await markStepComplete();
		if (step >= STEPS.length) {
			onDone();
		} else {
			setError(null);
			setStep((value) => value + 1);
		}
	};

	const addInvite = () => {
		const email = inviteEmail.trim();
		if (!email || !email.includes('@')) {
			setError('Enter a valid email address.');
			return;
		}
		setInvites((items) => [...items, { id: crypto.randomUUID(), email, role: inviteRole }]);
		setInviteEmail('');
		setError(null);
	};

	const updateInviteRole = (id: string, role: InviteRole) => {
		setInvites((items) => items.map((item) => item.id === id ? { ...item, role } : item));
	};

	const chooseDocument = (file?: File) => {
		if (file) setFirstDocument(file);
	};

	const toggleSource = (sourceId: string) => {
		setSelectedSources((items) => items.includes(sourceId)
			? items.filter((item) => item !== sourceId)
			: [...items, sourceId]);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.25 }}
				className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
			>
				<div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
					<div className="flex items-center gap-2">
						<span className="text-lg font-semibold text-white">dArchiva</span>
						<span className="rounded-full bg-indigo-600/25 px-2 py-0.5 text-xs font-medium text-indigo-300">
							Setup
						</span>
					</div>
					<button
						type="button"
						onClick={onDone}
						aria-label="Skip wizard"
						className="rounded-md p-1 text-slate-500 hover:text-slate-300"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="space-y-7 overflow-y-auto px-6 py-6">
					<ProgressBar current={step} />
					<AnimatePresence mode="wait">
						<motion.div
							key={currentStep.id}
							initial={{ opacity: 0, x: 16 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -16 }}
							transition={{ duration: 0.18 }}
						>
							{step === 1 && <StepWelcome />}
							{step === 2 && (
								<StepOrganizationSetup
									orgName={orgName}
									setOrgName={setOrgName}
									timezone={timezone}
									setTimezone={setTimezone}
									language={language}
									setLanguage={setLanguage}
									logoName={logoFile?.name ?? ''}
									onLogoChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
									error={error}
								/>
							)}
							{step === 3 && (
								<StepInviteTeam
									invites={invites}
									email={inviteEmail}
									setEmail={setInviteEmail}
									role={inviteRole}
									setRole={setInviteRole}
									onAdd={addInvite}
									onRoleChange={updateInviteRole}
									error={error}
								/>
							)}
							{step === 4 && (
								<StepFirstDocument
									fileName={firstDocument?.name ?? ''}
									isDragging={isDragging}
									onDrop={(event) => {
										event.preventDefault();
										setIsDragging(false);
										chooseDocument(event.dataTransfer.files?.[0]);
									}}
									onBrowse={(event) => chooseDocument(event.target.files?.[0])}
									onDragOver={(event) => {
										event.preventDefault();
										setIsDragging(true);
									}}
									onDragLeave={() => setIsDragging(false)}
								/>
							)}
							{step === 5 && <StepConnectSources selectedSources={selectedSources} onToggleSource={toggleSource} />}
							{step === 6 && <StepDone />}
						</motion.div>
					</AnimatePresence>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
					<button type="button" onClick={onDone} className="text-sm text-slate-500 hover:text-slate-300">
						Skip wizard
					</button>
					<div className="flex items-center gap-2">
						{canGoBack && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep((value) => value - 1)}
								className="text-slate-300 hover:bg-slate-800 hover:text-white"
							>
								<ArrowLeft className="h-4 w-4" />
								Back
							</Button>
						)}
						{step > 2 && step < STEPS.length && (
							<Button
								type="button"
								variant="ghost"
								onClick={skipStep}
								className="text-slate-400 hover:bg-slate-800 hover:text-white"
							>
								Skip for now
							</Button>
						)}
						<Button
							type="button"
							onClick={goNext}
							disabled={saving}
							className="bg-indigo-600 text-white hover:bg-indigo-500"
						>
							{step === STEPS.length && <CheckCircle2 className="h-4 w-4" />}
							{saving ? 'Saving...' : primaryLabel}
						</Button>
					</div>
				</div>
			</motion.div>
		</div>
	);
}

export default OnboardingWizard;
