// (c) Copyright Datacraft, 2026
import React from 'react';
import type { SearchMode } from '../types';
import { SEARCH_MODES } from '../types';

interface Props {
	value: SearchMode;
	onChange: (mode: SearchMode) => void;
	disabled?: boolean;
}

/**
 * Three-way toggle: Keyword | Semantic | Hybrid
 *
 * Each button shows the mode name and a short description beneath it.
 * The active button is highlighted; disabled state dims all buttons.
 */
export function SearchModeToggle({ value, onChange, disabled = false }: Props) {
	return (
		<div
			className="search-mode-toggle"
			role="group"
			aria-label="Search mode"
		>
			{SEARCH_MODES.map((mode) => {
				const isActive = mode.value === value;
				return (
					<button
						key={mode.value}
						type="button"
						className={[
							'search-mode-toggle__btn',
							isActive ? 'search-mode-toggle__btn--active' : '',
						].join(' ').trim()}
						onClick={() => !disabled && onChange(mode.value)}
						aria-pressed={isActive}
						disabled={disabled}
						title={mode.description}
					>
						<span className="search-mode-toggle__label">{mode.label}</span>
						<span className="search-mode-toggle__desc">{mode.description}</span>
					</button>
				);
			})}
		</div>
	);
}

export default SearchModeToggle;
