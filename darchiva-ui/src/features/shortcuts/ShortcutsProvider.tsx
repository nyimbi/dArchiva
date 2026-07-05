// (c) Copyright Datacraft, 2026
/**
 * ShortcutsProvider — context + global keyboard shortcut registrations.
 *
 * Exposes:
 *   shortcutsHelpOpen  / setShortcutsHelpOpen
 *
 * Global shortcuts registered here:
 *   ?               → open shortcuts help
 *   Escape          → close whichever is open
 *   g → h           → navigate /
 *   g → i           → navigate /inbox
 *   g → d           → navigate /documents
 *   g → s           → navigate /search
 *   g → a           → navigate /analytics
 *
 * Usage (wiring agent adds this in App.tsx):
 *   <ShortcutsProvider>
 *     <BrowserRouter>…</BrowserRouter>
 *   </ShortcutsProvider>
 *
 * Note: sequence shortcuts (g+d etc.) require BrowserRouter to be an ancestor
 * so that useNavigate() works. The provider renders ShortcutsHelp as a portal
 * at the root of the tree.
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { ShortcutsHelp } from './ShortcutsHelp';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ShortcutsContextValue {
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
	const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
	const navigate = useNavigate();

	// ? → shortcuts help (only when no input focused — handled inside hook)
	useKeyboardShortcut(
		['?'],
		useCallback(() => {
			setShortcutsHelpOpen(open => !open);
		}, []),
	);

	// Escape → close whichever is open
	useKeyboardShortcut(
		['Escape'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
		}, []),
	);

	// g → h : home
	useKeyboardShortcut(
		['g', 'h'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/');
		}, [navigate]),
	);

	// g → i : inbox
	useKeyboardShortcut(
		['g', 'i'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/inbox');
		}, [navigate]),
	);

	// g → d : documents
	useKeyboardShortcut(
		['g', 'd'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/documents');
		}, [navigate]),
	);

	// g → s : search
	useKeyboardShortcut(
		['g', 's'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/search');
		}, [navigate]),
	);

	// g → a : analytics
	useKeyboardShortcut(
		['g', 'a'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/analytics');
		}, [navigate]),
	);

	// g → w : workflows
	useKeyboardShortcut(
		['g', 'w'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/workflows');
		}, [navigate]),
	);

	// g → c : cases
	useKeyboardShortcut(
		['g', 'c'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/cases');
		}, [navigate]),
	);

	// g → n : notifications
	useKeyboardShortcut(
		['g', 'n'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/notifications');
		}, [navigate]),
	);

	// g → r : routing rules
	useKeyboardShortcut(
		['g', 'r'],
		useCallback(() => {
			setShortcutsHelpOpen(false);
			navigate('/routing');
		}, [navigate]),
	);

	return (
		<ShortcutsContext.Provider
			value={{ shortcutsHelpOpen, setShortcutsHelpOpen }}
		>
			{children}
			<ShortcutsHelp
				open={shortcutsHelpOpen}
				onClose={() => setShortcutsHelpOpen(false)}
			/>
		</ShortcutsContext.Provider>
	);
}
