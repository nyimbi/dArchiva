// (c) Copyright Datacraft, 2026
/**
 * ShortcutsProvider — context + global keyboard shortcut registrations.
 *
 * Exposes:
 *   commandPaletteOpen / setCommandPaletteOpen
 *   shortcutsHelpOpen  / setShortcutsHelpOpen
 *
 * Global shortcuts registered here:
 *   Cmd+K / Ctrl+K  → open command palette
 *   ?               → open shortcuts help
 *   Escape          → close whichever is open
 *   g → d           → navigate /documents
 *   g → s           → navigate /scanning-projects
 *   g → a           → navigate /analytics
 *
 * Usage (wiring agent adds this in App.tsx):
 *   <ShortcutsProvider>
 *     <BrowserRouter>…</BrowserRouter>
 *   </ShortcutsProvider>
 *
 * Note: sequence shortcuts (g+d etc.) require BrowserRouter to be an ancestor
 * so that useNavigate() works. The provider renders CommandPalette and
 * ShortcutsHelp as portals at the root of the tree.
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { CommandPalette } from '@/features/search/CommandPalette';
import { ShortcutsHelp } from './ShortcutsHelp';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ShortcutsContextValue {
	commandPaletteOpen: boolean;
	setCommandPaletteOpen: (open: boolean) => void;
	shortcutsHelpOpen: boolean;
	setShortcutsHelpOpen: (open: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcuts(): ShortcutsContextValue {
	const ctx = useContext(ShortcutsContext);
	if (!ctx) throw new Error('useShortcuts must be used inside ShortcutsProvider');
	return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ShortcutsProviderProps {
	children: React.ReactNode;
}

export function ShortcutsProvider({ children }: ShortcutsProviderProps) {
	const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
	const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
	const navigate = useNavigate();

	// Cmd+K / Ctrl+K → command palette
	useKeyboardShortcut(
		['Meta+k', 'Control+k'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			setCommandPaletteOpen(open => !open);
		}, []),
	);

	// ? → shortcuts help (only when no input focused — handled inside hook)
	useKeyboardShortcut(
		['?'],
		useCallback(() => {
			setCommandPaletteOpen(false);
			setShortcutsHelpOpen(open => !open);
		}, []),
	);

	// Escape → close whichever is open
	useKeyboardShortcut(
		['Escape'],
		useCallback(() => {
			setCommandPaletteOpen(false);
			setShortcutsHelpOpen(false);
		}, []),
	);

	// g → d : documents
	useKeyboardShortcut(
		['g', 'd'],
		useCallback(() => {
			setCommandPaletteOpen(false);
			setShortcutsHelpOpen(false);
			navigate('/documents');
		}, [navigate]),
	);

	// g → s : scanning-projects
	useKeyboardShortcut(
		['g', 's'],
		useCallback(() => {
			setCommandPaletteOpen(false);
			setShortcutsHelpOpen(false);
			navigate('/scanning-projects');
		}, [navigate]),
	);

	// g → a : analytics
	useKeyboardShortcut(
		['g', 'a'],
		useCallback(() => {
			setCommandPaletteOpen(false);
			setShortcutsHelpOpen(false);
			navigate('/analytics');
		}, [navigate]),
	);

	return (
		<ShortcutsContext.Provider
			value={{ commandPaletteOpen, setCommandPaletteOpen, shortcutsHelpOpen, setShortcutsHelpOpen }}
		>
			{children}
			<CommandPalette
				open={commandPaletteOpen}
				onClose={() => setCommandPaletteOpen(false)}
			/>
			<ShortcutsHelp
				open={shortcutsHelpOpen}
				onClose={() => setShortcutsHelpOpen(false)}
			/>
		</ShortcutsContext.Provider>
	);
}
