import { useEffect,useState } from 'react';
import { Download,X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_KEY = 'darchiva-install-prompt-dismissed-until';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed() {
	try {
		const raw = window.localStorage.getItem(DISMISSED_KEY);
		return raw ? Number(raw) > Date.now() : false;
	} catch {
		return false;
	}
}

function dismissForSevenDays() {
	try {
		window.localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_MS));
	} catch {
		// localStorage can be unavailable in some private browsing modes.
	}
}

export function InstallPrompt() {
	const location = useLocation();
	const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
	const [dismissed, setDismissed] = useState(() => isDismissed());
	const onScanningRoute = location.pathname === '/scanning' || location.pathname.startsWith('/scanning/');

	useEffect(() => {
		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			if (!isDismissed()) setPromptEvent(event as BeforeInstallPromptEvent);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
	}, []);

	if (!onScanningRoute || dismissed || !promptEvent) return null;

	const handleDismiss = () => {
		dismissForSevenDays();
		setDismissed(true);
	};

	const handleInstall = async () => {
		const event = promptEvent;
		setPromptEvent(null);
		await event.prompt();
		await event.userChoice.catch(() => null);
		dismissForSevenDays();
		setDismissed(true);
	};

	return (
		<div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-lg border border-brass-500/30 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur">
			<div className="flex min-w-0 items-center gap-3">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brass-500/15 text-brass-300">
					<Download className="h-4 w-4" />
				</div>
				<span className="truncate font-medium">Install dArchiva for offline scanning</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onClick={handleInstall}
					className="rounded-md bg-brass-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:bg-brass-400"
				>
					Install
				</button>
				<button
					type="button"
					onClick={handleDismiss}
					className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
					aria-label="Dismiss install prompt"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
