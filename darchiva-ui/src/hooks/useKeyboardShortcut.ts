// (c) Copyright Datacraft, 2026
/**
 * useKeyboardShortcut — register keyboard shortcuts with support for:
 *   - modifier+key combos: ["Meta+k", "Control+k"]
 *   - sequence shortcuts: ["g", "d"] (press g then d within 500ms)
 *
 * Usage:
 *   useKeyboardShortcut(["Meta+k", "Control+k"], () => openPalette());
 *   useKeyboardShortcut(["g", "d"], () => navigate("/documents"));
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseKeyboardShortcutOptions {
	enabled?: boolean;
	/** Element to listen on — defaults to window */
	target?: HTMLElement | null;
}

const SEQUENCE_TIMEOUT_MS = 500;

/** Normalise a key combo string like "Meta+k" into { modifiers, key }. */
function parseCombo(combo: string): { meta: boolean; ctrl: boolean; shift: boolean; alt: boolean; key: string } {
	const parts = combo.split('+');
	const key = parts[parts.length - 1].toLowerCase();
	return {
		meta:  parts.includes('Meta'),
		ctrl:  parts.includes('Control'),
		shift: parts.includes('Shift'),
		alt:   parts.includes('Alt'),
		key,
	};
}

/** Returns true if the keyboard event matches the parsed combo. */
function matchesCombo(
	e: KeyboardEvent,
	parsed: ReturnType<typeof parseCombo>,
): boolean {
	return (
		e.key.toLowerCase() === parsed.key &&
		e.metaKey  === parsed.meta  &&
		e.ctrlKey  === parsed.ctrl  &&
		e.shiftKey === parsed.shift &&
		e.altKey   === parsed.alt
	);
}

export function useKeyboardShortcut(
	keys: string[],
	callback: () => void,
	options: UseKeyboardShortcutOptions = {},
): void {
	const { enabled = true } = options;
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	// Sequence state: pending key + expiry timestamp
	const sequenceRef = useRef<{ key: string; expiresAt: number } | null>(null);

	// Detect whether this is a sequence shortcut (no combo in any key)
	const isSequence = keys.every(k => !k.includes('+'));

	const handleKeyDown = useCallback(
		(e: Event) => {
			const event = e as KeyboardEvent;

			// Ignore shortcuts when focused in an input/textarea/select/contenteditable
			const target = event.target as HTMLElement;
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable
			) {
				return;
			}

			if (isSequence) {
				// Sequence handling: keys[0] → keys[1]
				const [firstKey, secondKey] = keys;
				const now = Date.now();

				if (
					sequenceRef.current &&
					event.key.toLowerCase() === secondKey.toLowerCase() &&
					now < sequenceRef.current.expiresAt &&
					sequenceRef.current.key === firstKey.toLowerCase()
				) {
					// Sequence complete
					sequenceRef.current = null;
					event.preventDefault();
					callbackRef.current();
					return;
				}

				if (event.key.toLowerCase() === firstKey.toLowerCase()) {
					sequenceRef.current = {
						key: firstKey.toLowerCase(),
						expiresAt: now + SEQUENCE_TIMEOUT_MS,
					};
					return;
				}

				// Key doesn't match sequence start — reset
				if (sequenceRef.current && now >= sequenceRef.current.expiresAt) {
					sequenceRef.current = null;
				}
				return;
			}

			// Combo handling: match any of the provided combos
			for (const combo of keys) {
				const parsed = parseCombo(combo);
				if (matchesCombo(event, parsed)) {
					event.preventDefault();
					callbackRef.current();
					return;
				}
			}
		},
		[isSequence, keys],
	);

	useEffect(() => {
		if (!enabled) return;

		const el: EventTarget = options.target ?? window;
		el.addEventListener('keydown', handleKeyDown);
		return () => el.removeEventListener('keydown', handleKeyDown);
	}, [enabled, handleKeyDown, options.target]);
}
