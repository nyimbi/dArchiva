// (c) Copyright Datacraft, 2026
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from './ThemeProvider';

const CYCLE: Theme[] = ['dark', 'light', 'system'];

const LABELS: Record<Theme, string> = {
	dark: 'Dark mode',
	light: 'Light mode',
	system: 'System theme',
};

const ICONS: Record<Theme, React.ReactNode> = {
	dark: <Moon className="h-4 w-4" />,
	light: <Sun className="h-4 w-4" />,
	system: <Monitor className="h-4 w-4" />,
};

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	function cycle() {
		const idx = CYCLE.indexOf(theme);
		setTheme(CYCLE[(idx + 1) % CYCLE.length]);
	}

	return (
		<button
			type="button"
			onClick={cycle}
			title={LABELS[theme]}
			aria-label={LABELS[theme]}
			className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
		>
			{ICONS[theme]}
		</button>
	);
}
