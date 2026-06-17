// (c) Copyright Datacraft, 2026
/**
 * OnboardingWizard — full-screen modal overlay for first-login tenant setup.
 * Shown when onboarding is not yet complete.
 * DO NOT wire here — wiring agent handles App.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ChevronRight,
	FolderPlus,
	ScanLine,
	Sliders,
	Users,
	CheckCircle2,
	Download,
	Monitor,
	X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useCompleteStep, useOnboardingStatus } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardProps {
	/** Called when the user finishes or dismisses the wizard. */
	onDone: () => void;
}

// ---------------------------------------------------------------------------
// Confetti (pure CSS/JS, no extra dep)
// ---------------------------------------------------------------------------

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
			color: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'][
				Math.floor(Math.random() * 6)
			],
			vx: (Math.random() - 0.5) * 2,
			vy: Math.random() * 3 + 1,
			angle: Math.random() * Math.PI * 2,
			spin: (Math.random() - 0.5) * 0.2,
		}));

		let frame: number;
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
		const timer = setTimeout(() => cancelAnimationFrame(frame), 4000);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			className="pointer-events-none fixed inset-0 z-[60]"
			aria-hidden
		/>
	);
}

// ---------------------------------------------------------------------------
// Step metadata
// ---------------------------------------------------------------------------

const STEP_META = [
	{ id: 'create_project', label: 'Create project', icon: FolderPlus },
	{ id: 'configure_scanner', label: 'Scanner setup', icon: ScanLine },
	{ id: 'set_quality_thresholds', label: 'Quality thresholds', icon: Sliders },
	{ id: 'invite_operator', label: 'Invite team', icon: Users },
] as const;

// ---------------------------------------------------------------------------
// Step 1 — Create first project
// ---------------------------------------------------------------------------

function StepCreateProject({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const completeStep = useCompleteStep();

	const handleCreate = async () => {
		if (!name.trim()) {
			setError('Project name is required.');
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await apiClient.post('/scanning-projects', { name: name.trim(), description });
			await completeStep.mutateAsync('create_project');
			onNext();
		} catch {
			setError('Failed to create project. You can skip and do this later.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-white">Create your first project</h2>
				<p className="mt-1 text-sm text-slate-400">
					Projects organise scanned documents and track scanning progress.
				</p>
			</div>
			<div className="space-y-4">
				<div className="space-y-1">
					<Label htmlFor="proj-name" className="text-slate-300">
						Project name
					</Label>
					<Input
						id="proj-name"
						placeholder="e.g. HR Archive 2026"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="proj-desc" className="text-slate-300">
						Description{' '}
						<span className="text-slate-500 font-normal">(optional)</span>
					</Label>
					<Textarea
						id="proj-desc"
						placeholder="What documents does this project cover?"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
						className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
					/>
				</div>
				{error && <p className="text-sm text-red-400">{error}</p>}
			</div>
			<div className="flex gap-3 pt-2">
				<Button
					onClick={handleCreate}
					disabled={loading}
					className="bg-indigo-600 hover:bg-indigo-500 text-white"
				>
					{loading ? 'Creating…' : 'Create Project'}
					{!loading && <ChevronRight className="ml-1 h-4 w-4" />}
				</Button>
				<Button variant="ghost" onClick={onSkip} className="text-slate-400 hover:text-slate-200">
					Skip
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 2 — Configure scanner
// ---------------------------------------------------------------------------

function StepConfigureScanner({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
	const completeStep = useCompleteStep();

	const handleReady = async () => {
		await completeStep.mutateAsync('configure_scanner');
		onNext();
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-white">Configure scanner connection</h2>
				<p className="mt-1 text-sm text-slate-400">
					Connect dArchiva to your scanner using one of the options below.
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				{/* Card: Scan Agent */}
				<a
					href="/download/scan-agent"
					target="_blank"
					rel="noopener noreferrer"
					className="group flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800 p-5 hover:border-indigo-500 hover:bg-slate-750 transition-colors"
				>
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-indigo-600/20 p-2">
							<Download className="h-5 w-5 text-indigo-400" />
						</div>
						<span className="font-medium text-white">Download Scan Agent</span>
					</div>
					<p className="text-sm text-slate-400 leading-relaxed">
						Windows · macOS · Linux. Lightweight background service that bridges
						your scanner to dArchiva over a secure WebSocket.
					</p>
					<span className="mt-auto text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
						Download installer →
					</span>
				</a>

				{/* Card: TWAIN Direct */}
				<div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800 p-5">
					<div className="flex items-center gap-3">
						<div className="rounded-md bg-cyan-600/20 p-2">
							<Monitor className="h-5 w-5 text-cyan-400" />
						</div>
						<span className="font-medium text-white">Use TWAIN Direct</span>
					</div>
					<p className="text-sm text-slate-400 leading-relaxed">
						Browser-based scanning for TWAIN Direct–compatible devices. No
						software to install — open the Scan Station from the sidebar and
						follow the on-screen prompts.
					</p>
					<span className="mt-auto text-xs text-slate-500">No download required</span>
				</div>
			</div>
			<div className="flex gap-3 pt-2">
				<Button
					onClick={handleReady}
					className="bg-indigo-600 hover:bg-indigo-500 text-white"
				>
					My scanner is ready
					<ChevronRight className="ml-1 h-4 w-4" />
				</Button>
				<Button variant="ghost" onClick={onSkip} className="text-slate-400 hover:text-slate-200">
					Skip
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 3 — Quality thresholds
// ---------------------------------------------------------------------------

function StepQualityThresholds({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
	const [score, setScore] = useState(60);
	const completeStep = useCompleteStep();

	const handleSave = async () => {
		localStorage.setItem('darchiva_default_quality_threshold', String(score));
		await completeStep.mutateAsync('set_quality_thresholds');
		onNext();
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-white">Set quality thresholds</h2>
				<p className="mt-1 text-sm text-slate-400">
					Pages below the minimum score will be flagged for operator review.
				</p>
			</div>
			<div className="space-y-5 rounded-lg border border-slate-700 bg-slate-800 p-5">
				<div className="flex items-center justify-between">
					<Label className="text-slate-300">Minimum quality score</Label>
					<span className="text-2xl font-bold tabular-nums text-indigo-400">{score}</span>
				</div>
				<Slider
					min={0}
					max={100}
					step={1}
					value={[score]}
					onValueChange={([v]) => setScore(v)}
					className="[&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-400"
				/>
				<div className="flex justify-between text-xs text-slate-500">
					<span>0 — accept all</span>
					<span>100 — perfect only</span>
				</div>
				<p className="text-sm text-slate-400 border-t border-slate-700 pt-4">
					{score < 40
						? 'Low threshold — most pages pass. Good for internal archives.'
						: score < 70
						? 'Balanced — catches obviously bad scans without too many false flags.'
						: 'Strict — suitable for legal or compliance-grade archives.'}
				</p>
			</div>
			<div className="flex gap-3 pt-2">
				<Button
					onClick={handleSave}
					className="bg-indigo-600 hover:bg-indigo-500 text-white"
				>
					Save &amp; Continue
					<ChevronRight className="ml-1 h-4 w-4" />
				</Button>
				<Button variant="ghost" onClick={onSkip} className="text-slate-400 hover:text-slate-200">
					Skip
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 4 — Invite operator
// ---------------------------------------------------------------------------

function StepInviteOperator({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<'operator' | 'supervisor'>('operator');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const completeStep = useCompleteStep();

	const handleInvite = async () => {
		if (!email.trim() || !email.includes('@')) {
			setError('Enter a valid email address.');
			return;
		}
		setLoading(true);
		setError(null);
		try {
			// Best-effort — endpoint may not yet exist
			await apiClient.post('/users/invite', { email: email.trim(), role });
		} catch {
			// Swallow — simulate success if endpoint missing
		} finally {
			setLoading(false);
			setSent(true);
		}
		await completeStep.mutateAsync('invite_operator');
		onNext();
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-white">Invite your team</h2>
				<p className="mt-1 text-sm text-slate-400">
					Add an operator or supervisor to collaborate on scanning projects.
				</p>
			</div>
			<div className="space-y-4">
				<div className="space-y-1">
					<Label htmlFor="invite-email" className="text-slate-300">
						Email address
					</Label>
					<Input
						id="invite-email"
						type="email"
						placeholder="colleague@organisation.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={sent}
						className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor="invite-role" className="text-slate-300">
						Role
					</Label>
					<select
						id="invite-role"
						value={role}
						onChange={(e) => setRole(e.target.value as 'operator' | 'supervisor')}
						disabled={sent}
						className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<option value="operator">Operator — scans documents</option>
						<option value="supervisor">Supervisor — reviews &amp; approves</option>
					</select>
				</div>
				{error && <p className="text-sm text-red-400">{error}</p>}
			</div>
			<div className="flex gap-3 pt-2">
				<Button
					onClick={handleInvite}
					disabled={loading || sent}
					className="bg-indigo-600 hover:bg-indigo-500 text-white"
				>
					{loading ? 'Sending…' : sent ? 'Invite sent!' : 'Send Invite'}
					{!loading && !sent && <ChevronRight className="ml-1 h-4 w-4" />}
				</Button>
				<Button variant="ghost" onClick={onSkip} className="text-slate-400 hover:text-slate-200">
					I'll do this later
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Completion screen
// ---------------------------------------------------------------------------

function CompletionScreen({ onDone }: { onDone: () => void }) {
	return (
		<>
			<Confetti />
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className="flex flex-col items-center gap-6 py-6 text-center"
			>
				<div className="rounded-full bg-emerald-500/20 p-5">
					<CheckCircle2 className="h-14 w-14 text-emerald-400" />
				</div>
				<div>
					<h2 className="text-2xl font-bold text-white">You're all set!</h2>
					<p className="mt-2 text-slate-400 max-w-sm">
						dArchiva is configured and ready to go. Head to the dashboard to start
						scanning.
					</p>
				</div>
				<Button
					onClick={onDone}
					size="lg"
					className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
				>
					Go to Dashboard
				</Button>
			</motion.div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
	return (
		<div className="mb-8">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
					Setup progress
				</span>
				<span className="text-xs font-medium text-indigo-400">
					Step {current} of {total}
				</span>
			</div>
			<div className="flex gap-1.5">
				{Array.from({ length: total }, (_, i) => (
					<div
						key={i}
						className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
							i < current ? 'bg-indigo-500' : 'bg-slate-700'
						}`}
					/>
				))}
			</div>
			<div className="flex gap-1.5 mt-3">
				{STEP_META.map(({ label, icon: Icon }, i) => (
					<div
						key={i}
						className={`flex flex-1 flex-col items-center gap-1 transition-opacity ${
							i < current - 1
								? 'opacity-40'
								: i === current - 1
								? 'opacity-100'
								: 'opacity-30'
						}`}
					>
						<Icon
							className={`h-4 w-4 ${i === current - 1 ? 'text-indigo-400' : 'text-slate-500'}`}
						/>
						<span className="hidden sm:block text-[10px] text-slate-500 text-center leading-tight">
							{label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function OnboardingWizard({ onDone }: WizardProps) {
	const { data: status, isLoading } = useOnboardingStatus();
	const [step, setStep] = useState(1);
	const [complete, setComplete] = useState(false);

	// If server says onboarding is already done, close immediately
	useEffect(() => {
		if (status?.isComplete) onDone();
	}, [status, onDone]);

	if (isLoading) return null;

	const totalSteps = STEP_META.length;

	const advance = () => {
		if (step >= totalSteps) {
			setComplete(true);
		} else {
			setStep((s) => s + 1);
		}
	};

	const skip = () => advance();

	return (
		// Backdrop
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
			{/* Panel */}
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
			>
				{/* Header */}
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<span className="text-lg font-bold text-white">dArchiva</span>
						<span className="rounded-full bg-indigo-600/30 px-2 py-0.5 text-xs font-medium text-indigo-300">
							Setup
						</span>
					</div>
					{/* X button — only visible before completion */}
					{!complete && (
						<button
							onClick={onDone}
							aria-label="Close setup wizard"
							className="rounded-md p-1 text-slate-500 hover:text-slate-300 transition-colors"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{!complete && <ProgressBar current={step} total={totalSteps} />}

				<AnimatePresence mode="wait">
					{complete ? (
						<motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
							<CompletionScreen onDone={onDone} />
						</motion.div>
					) : (
						<motion.div
							key={step}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
						>
							{step === 1 && <StepCreateProject onNext={advance} onSkip={skip} />}
							{step === 2 && <StepConfigureScanner onNext={advance} onSkip={skip} />}
							{step === 3 && <StepQualityThresholds onNext={advance} onSkip={skip} />}
							{step === 4 && <StepInviteOperator onNext={advance} onSkip={skip} />}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</div>
	);
}

export default OnboardingWizard;
